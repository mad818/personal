/**
 * app/api/mqtt/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS PRIME MQTT ↔ Browser bridge via Server-Sent Events (SSE).
 *
 * GET  /api/mqtt?topics=home/sensors,home/cameras&broker=localhost:1883
 *   → Streams MQTT messages as SSE events to the browser.
 *   → Currently runs in SIMULATED mode (no real MQTT broker required).
 *
 * POST /api/mqtt  { topic: string, payload: unknown, broker?: string }
 *   → Publishes a message to the MQTT broker (or logs in simulated mode).
 *
 * ─── TO CONNECT A REAL MQTT BROKER ──────────────────────────────────────────
 *  1. npm install mqtt
 *  2. Replace the simulated section with:
 *
 *     import mqtt from 'mqtt'
 *
 *     const client = mqtt.connect(`mqtt://${broker}`, {
 *       clientId: `nexus-${Math.random().toString(16).slice(2, 8)}`,
 *       clean: true,
 *     })
 *     client.subscribe(topicList)
 *     client.on('message', (topic, message) => {
 *       const data = `data: ${JSON.stringify({ topic, payload: message.toString(), ts: Date.now() })}\n\n`
 *       controller.enqueue(encoder.encode(data))
 *     })
 *     request.signal.addEventListener('abort', () => client.end())
 *
 * ─── TO CONNECT MQTT OVER WEBSOCKET (browser-side) ───────────────────────────
 *  Use the wsManager with a broker that supports WS (e.g., ws://localhost:9001)
 *  Most MQTT brokers (Mosquitto, EMQX, HiveMQ) support WS on port 9001.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'

// ── Simulated sensor topics ────────────────────────────────────────────────────
const SIMULATED_DEVICES = [
  { topic: 'home/sensors/temp',     type: 'temperature', unit: '°C',  base: 21,  variance: 3  },
  { topic: 'home/sensors/humidity', type: 'humidity',    unit: '%',   base: 55,  variance: 10 },
  { topic: 'home/sensors/motion',   type: 'motion',      unit: 'bool', base: 0,  variance: 1  },
  { topic: 'home/cameras/front',    type: 'camera',      unit: 'fps',  base: 30, variance: 0  },
  { topic: 'home/power/main',       type: 'power',       unit: 'W',   base: 450, variance: 100 },
]

function simulateMessage(topics: string[]): object {
  const candidates = SIMULATED_DEVICES.filter(
    (d) => topics.length === 0 || topics.some((t) => d.topic.startsWith(t.replace('#', '').replace('+', '')) || t === '#')
  )
  const device = candidates[Math.floor(Math.random() * candidates.length)] ?? SIMULATED_DEVICES[0]
  const value  = device.base + (Math.random() - 0.5) * 2 * device.variance
  return {
    topic:   device.topic,
    payload: {
      deviceId: device.topic.split('/').pop() ?? 'unknown',
      type:     device.type,
      value:    parseFloat(value.toFixed(2)),
      unit:     device.unit,
    },
    ts: Date.now(),
  }
}

// ── GET — SSE stream ───────────────────────────────────────────────────────────
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const topicsParam = searchParams.get('topics') ?? ''
  // broker param reserved for real MQTT connection (unused in simulated mode)
  // const broker = searchParams.get('broker') ?? 'localhost:1883'
  const topics = topicsParam ? topicsParam.split(',').map((t) => t.trim()) : []

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send connection confirmation
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'connected', topics, simulated: true, ts: Date.now() })}\n\n`
        )
      )

      // Simulate MQTT messages at variable intervals
      let messageCount = 0
      const sendMessage = () => {
        if (request.signal.aborted) return
        try {
          const msg = simulateMessage(topics)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(msg)}\n\n`)
          )
          messageCount++

          // Send heartbeat every 10 messages
          if (messageCount % 10 === 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', ts: Date.now() })}\n\n`)
            )
          }

          // Schedule next message with random jitter (500ms–3000ms)
          const interval = 500 + Math.random() * 2500
          if (!request.signal.aborted) {
            setTimeout(sendMessage, interval)
          }
        } catch {
          // Client disconnected
        }
      }

      // Start after a short delay
      setTimeout(sendMessage, 200)

      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':                'text/event-stream',
      'Cache-Control':               'no-cache, no-transform',
      'Connection':                  'keep-alive',
      'X-Accel-Buffering':           'no',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

// ── POST — Publish to MQTT ─────────────────────────────────────────────────────
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { topic?: string; payload?: unknown; broker?: string }
    const { topic, payload, broker = 'localhost:1883' } = body

    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 })
    }

    // ── Real MQTT publish would go here ───────────────────────────────────────
    // To enable: npm install mqtt, then:
    //
    // import mqtt from 'mqtt'
    // const client = mqtt.connect(`mqtt://${broker}`)
    // await new Promise<void>((resolve, reject) => {
    //   client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
    //     client.end()
    //     err ? reject(err) : resolve()
    //   })
    // })
    // ─────────────────────────────────────────────────────────────────────────

    // Simulated mode — log the publish and return success
    console.log(`[MQTT SIM] Publish to ${broker} → ${topic}:`, payload)

    return NextResponse.json({
      ok:        true,
      topic,
      broker,
      simulated: true,
      ts:        Date.now(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
