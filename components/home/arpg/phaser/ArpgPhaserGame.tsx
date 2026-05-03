"use client";

import { useEffect, useRef } from "react";
import type { AgentId } from "@/components/home/office/types";
import type { DispatchBar } from "@/components/home/office/officeCommandCenterConfig";
import { isEditableTarget } from "@/components/home/office/officeCommandCenterConfig";
import { AGENTS } from "@/components/home/office/constants";
import {
  ARPG_ENEMIES,
  ARPG_FIRST_ZONE,
  ARPG_GAME_TITLE,
  ARPG_LOOT_NODES,
  ARPG_LORE_NODES,
} from "@/lib/arpgGameContent";
import { ARPG_ENEMY_COMBAT_PROFILES } from "@/lib/arpgCombatContent";
import {
  getArpgCharacterProfile,
  getNearestArpgInteraction,
  normalizeArpgSave,
  type ArpgMoveVector,
  type ArpgSaveState,
} from "@/lib/arpgGame";
import { useStore } from "@/store/useStore";

interface ArpgPhaserGameProps {
  activeAgent: AgentId | null;
  dispatchBar: DispatchBar | null;
  reducedMotion: boolean;
  motionIntensity: number;
  runtimeStatusLabel: string;
}

interface RuntimeSnapshot {
  activeAgent: AgentId | null;
  dispatchActive: boolean;
  reducedMotion: boolean;
  motionIntensity: number;
  runtimeStatusLabel: string;
}

interface PhaserController {
  getSave: () => ArpgSaveState;
  getRuntime: () => RuntimeSnapshot;
  move: (vector: ArpgMoveVector) => void;
  collect: (itemId: string, sourceId?: string) => void;
  equip: (itemOrInstanceId: string) => void;
  strike: (enemyId: string) => void;
  target: (enemyId: string | null) => void;
  skill: (skillId?: string | null, enemyId?: string | null) => void;
  dodge: (vector?: ArpgMoveVector | null) => void;
  advanceStory: (storyFlag: string) => void;
  beginTravel: (routeId: string) => void;
}

const WORLD_ORIGIN = { x: 760, y: 430 };
const TILE = { x: 92, z: 54 };

function worldToScreen(x: number, z: number) {
  return {
    x: WORLD_ORIGIN.x + x * TILE.x - z * 42,
    y: WORLD_ORIGIN.y + z * TILE.z + x * 24,
  };
}

function readableAgentColor(activeAgent: AgentId | null) {
  return activeAgent ? AGENTS[activeAgent].color : "#ffd166";
}

function parseHexColor(value: string | null | undefined, fallback: number) {
  const hex = typeof value === "string" ? value.replace("#", "").trim() : "";
  if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
  return Number.parseInt(hex, 16);
}

const PLAYER_SHEET_KEY = "arpg-player-sheet";
const PLAYER_FALLBACK_KEY = "arpg-player-sprite";
const ILLUSTRATED_OUTFIT_KEY = "arpg-illustrated-hero-kit-outfits";
const ILLUSTRATED_ENEMY_CARD_KEY = "arpg-illustrated-enemy-cards";
const ILLUSTRATED_ITEM_KEY = "arpg-illustrated-hero-kit-items";
const ILLUSTRATED_LOCATION_KEY = "arpg-illustrated-location-cards";
const PLAYER_SHEET_Y_OFFSET = -38;
const PLAYER_FALLBACK_Y_OFFSET = -20;
const PLAYER_ILLUSTRATED_Y_OFFSET = -54;
const PLAYER_ILLUSTRATED_SCALE = 0.19;
const ENEMY_ILLUSTRATED_SCALE = 0.125;
const BOSS_ILLUSTRATED_SCALE = 0.155;
const ENEMY_ILLUSTRATED_Y_OFFSET = -46;
const PLAYER_CLASS_FRAMES: Record<string, number> = {
  wardbreaker: 0,
  relicweaver: 1,
  ashrunner: 2,
  oathblade: 3,
  thornwarden: 4,
  gravechanter: 5,
  "ember-monk": 6,
  wayfarer: 7,
};
const HERO_KIT_CLASS_FRAMES: Record<string, number> = {
  wardbreaker: 0,
  relicweaver: 1,
  ashrunner: 2,
};
const ILLUSTRATED_ENEMY_FRAMES: Record<string, number> = {
  "hollow-sentry": 0,
  "ashling-scout": 1,
  "rune-husk": 2,
  "brass-warden": 3,
  "ember-mote": 1,
  "glass-gnawer": 2,
};
const ILLUSTRATED_LOOT_FRAMES: Record<string, number> = {
  "cinder-glaive": 7,
  "ember-buckler": 1,
  "health-vial": 8,
  "focus-draught": 8,
  "oracle-focus": 2,
  "relic-dust": 9,
  "upgrade-shard": 10,
  "gate-key-fragment": 11,
  "loomshard-charm": 11,
};

function playerSpriteFrameForSave(save: ArpgSaveState) {
  return PLAYER_CLASS_FRAMES[getArpgCharacterProfile(save).classTree.id] ?? 0;
}

function illustratedPlayerFrameForSave(save: ArpgSaveState) {
  const classTreeId = getArpgCharacterProfile(save).classTree.id;
  return HERO_KIT_CLASS_FRAMES[classTreeId] ?? playerSpriteFrameForSave(save) % 3;
}

function nearestLiveEnemy(save: ArpgSaveState) {
  return Object.values(ARPG_ENEMIES)
    .filter((enemy) => !save.enemies[enemy.id]?.defeated)
    .map((enemy) => ({
      enemy,
      distance: Math.hypot(save.player.x - enemy.position.x, save.player.z - enemy.position.z),
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.enemy;
}

export default function ArpgPhaserGame({
  activeAgent,
  dispatchBar,
  reducedMotion,
  motionIntensity,
  runtimeStatusLabel,
}: ArpgPhaserGameProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const save = useStore((s) => s.arpgSave);
  const moveArpgPlayer = useStore((s) => s.moveArpgPlayer);
  const collectArpgItem = useStore((s) => s.collectArpgItem);
  const equipArpgItem = useStore((s) => s.equipArpgItem);
  const strikeArpgEnemy = useStore((s) => s.strikeArpgEnemy);
  const targetArpgEnemy = useStore((s) => s.targetArpgEnemy);
  const useArpgSkill = useStore((s) => s.useArpgSkill);
  const dodgeArpgPlayer = useStore((s) => s.dodgeArpgPlayer);
  const advanceArpgStory = useStore((s) => s.advanceArpgStory);
  const beginArpgTravel = useStore((s) => s.beginArpgTravel);
  const saveRef = useRef(normalizeArpgSave(save));
  const runtimeRef = useRef<RuntimeSnapshot>({
    activeAgent,
    dispatchActive: Boolean(dispatchBar),
    reducedMotion,
    motionIntensity,
    runtimeStatusLabel,
  });
  const actionsRef = useRef({
    moveArpgPlayer,
    collectArpgItem,
    equipArpgItem,
    strikeArpgEnemy,
    targetArpgEnemy,
    useArpgSkill,
    dodgeArpgPlayer,
    advanceArpgStory,
    beginArpgTravel,
  });

  useEffect(() => {
    saveRef.current = normalizeArpgSave(save);
    sceneRef.current?.syncSave?.(saveRef.current);
  }, [save]);

  useEffect(() => {
    runtimeRef.current = {
      activeAgent,
      dispatchActive: Boolean(dispatchBar),
      reducedMotion,
      motionIntensity,
      runtimeStatusLabel,
    };
    sceneRef.current?.syncRuntime?.(runtimeRef.current);
  }, [activeAgent, dispatchBar, motionIntensity, reducedMotion, runtimeStatusLabel]);

  useEffect(() => {
    actionsRef.current = {
      moveArpgPlayer,
      collectArpgItem,
      equipArpgItem,
      strikeArpgEnemy,
      targetArpgEnemy,
      useArpgSkill,
      dodgeArpgPlayer,
      advanceArpgStory,
      beginArpgTravel,
    };
  }, [
    advanceArpgStory,
    beginArpgTravel,
    collectArpgItem,
    dodgeArpgPlayer,
    equipArpgItem,
    moveArpgPlayer,
    strikeArpgEnemy,
    targetArpgEnemy,
    useArpgSkill,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const save = saveRef.current;

      if (key === "e" || key === "enter") {
        const interaction = getNearestArpgInteraction(save);
        if (!interaction?.inRange) return;
        event.preventDefault();
        if (interaction.kind === "lore") {
          const node = ARPG_LORE_NODES[interaction.id];
          if (node) actionsRef.current.advanceArpgStory(node.storyFlag);
          return;
        }
        if (interaction.kind === "loot") {
          const node = ARPG_LOOT_NODES[interaction.id];
          if (!node) return;
          if (interaction.complete) {
            const entry = save.inventory.find((item) => item.itemId === node.itemId);
            if (entry) actionsRef.current.equipArpgItem(entry.instanceId);
          } else {
            actionsRef.current.collectArpgItem(node.itemId, node.id);
          }
          return;
        }
        if (interaction.kind === "travel") {
          actionsRef.current.beginArpgTravel(interaction.id);
          return;
        }
        actionsRef.current.strikeArpgEnemy(interaction.id);
        return;
      }

      if (key === " " || key === "spacebar") {
        event.preventDefault();
        const enemy = nearestLiveEnemy(save);
        if (enemy) {
          actionsRef.current.targetArpgEnemy(enemy.id);
          actionsRef.current.strikeArpgEnemy(enemy.id);
        }
        return;
      }

      if (key === "1" || key === "2") {
        event.preventDefault();
        const skillId = save.player.equippedSkillIds[key === "1" ? 0 : 1] ?? null;
        actionsRef.current.useArpgSkill(skillId, save.combat.targetEnemyId);
        return;
      }

      if (key === "shift") {
        event.preventDefault();
        actionsRef.current.dodgeArpgPlayer();
        return;
      }

      const vector =
        key === "w" || key === "arrowup"
          ? { x: 0, z: -1, label: "north" }
          : key === "s" || key === "arrowdown"
            ? { x: 0, z: 1, label: "south" }
            : key === "a" || key === "arrowleft"
              ? { x: -1, z: 0, label: "west" }
              : key === "d" || key === "arrowright"
                ? { x: 1, z: 0, label: "east" }
                : null;

      if (vector) {
        event.preventDefault();
        actionsRef.current.moveArpgPlayer(vector);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let canvasObserver: MutationObserver | null = null;

    async function boot() {
      const mount = mountRef.current;
      if (!mount) return;
      const PhaserModule = await import("phaser");
      if (cancelled || !mountRef.current) return;
      const Phaser = (PhaserModule as any).default ?? PhaserModule;
      const controller: PhaserController = {
        getSave: () => saveRef.current,
        getRuntime: () => runtimeRef.current,
        move: (vector) => actionsRef.current.moveArpgPlayer(vector),
        collect: (itemId, sourceId) => actionsRef.current.collectArpgItem(itemId, sourceId),
        equip: (itemOrInstanceId) => actionsRef.current.equipArpgItem(itemOrInstanceId),
        strike: (enemyId) => actionsRef.current.strikeArpgEnemy(enemyId),
        target: (enemyId) => actionsRef.current.targetArpgEnemy(enemyId),
        skill: (skillId, enemyId) => actionsRef.current.useArpgSkill(skillId, enemyId),
        dodge: (vector) => actionsRef.current.dodgeArpgPlayer(vector),
        advanceStory: (storyFlag) => actionsRef.current.advanceArpgStory(storyFlag),
        beginTravel: (routeId) => actionsRef.current.beginArpgTravel(routeId),
      };

      class FirstReliquaryScene extends Phaser.Scene {
        controller: PhaserController;
        playerSprite: any = null;
        playerHalo: any = null;
        contextRing: any = null;
        oraclePips: any[] = [];
        enemySprites = new Map<string, any>();
        enemyBars = new Map<string, any>();
        enemyTelegraphs = new Map<string, any>();
        enemyStatusIcons = new Map<string, any>();
        lootSprites = new Map<string, any>();
        loreSprites = new Map<string, any>();
        lastMoveAt = 0;
        lastEventKey = "";
        lastCombatEventId = "";
        keys: Record<string, any> = {};

        constructor(sceneController: PhaserController) {
          super({ key: "FirstReliquaryScene" });
          this.controller = sceneController;
        }

        preload() {
          this.load.spritesheet(PLAYER_SHEET_KEY, "/arpg/player-character-sprites.png", {
            frameWidth: 96,
            frameHeight: 128,
          });
          this.load.spritesheet(ILLUSTRATED_OUTFIT_KEY, "/arpg/illustrated/hero-kit-class-outfits.png", {
            frameWidth: 256,
            frameHeight: 384,
          });
          this.load.spritesheet(ILLUSTRATED_ENEMY_CARD_KEY, "/arpg/illustrated/enemy-cards.png", {
            frameWidth: 320,
            frameHeight: 448,
          });
          this.load.spritesheet(ILLUSTRATED_ITEM_KEY, "/arpg/illustrated/hero-kit-weapons-items.png", {
            frameWidth: 96,
            frameHeight: 96,
          });
          this.load.spritesheet(ILLUSTRATED_LOCATION_KEY, "/arpg/illustrated/location-cards.png", {
            frameWidth: 320,
            frameHeight: 192,
          });
          this.load.spritesheet("arpg-enemy-sheet", "/arpg/enemies-first-reliquary.png", {
            frameWidth: 64,
            frameHeight: 64,
          });
          this.load.spritesheet("arpg-item-icons", "/arpg/items-first-reliquary.png", {
            frameWidth: 48,
            frameHeight: 48,
          });
          this.load.spritesheet("arpg-status-icons", "/arpg/status-effects.png", {
            frameWidth: 32,
            frameHeight: 32,
          });
        }

        create() {
          this.cameras.main.setBackgroundColor("#140d08");
          this.cameras.main.setBounds(0, 0, 1540, 900);
          this.createTextures();
          this.drawZone();
          this.createInteractables();
          this.createEnemies();
          this.createPlayer();
          this.createOraclePips();
          this.keys = this.input.keyboard?.addKeys({
            up: "W",
            down: "S",
            left: "A",
            right: "D",
            arrowUp: "UP",
            arrowDown: "DOWN",
            arrowLeft: "LEFT",
            arrowRight: "RIGHT",
            interact: "E",
            enter: "ENTER",
            attack: "SPACE",
            skill1: "ONE",
            skill2: "TWO",
            dodge: "SHIFT",
          }) as Record<string, any>;
          this.syncSave(this.controller.getSave());
          this.syncRuntime(this.controller.getRuntime());
        }

        createTextures() {
          const player = this.make.graphics({ x: 0, y: 0, add: false });
          player.fillStyle(0xf0c28a, 1);
          player.fillCircle(20, 12, 9);
          player.fillStyle(0x6b3f24, 1);
          player.fillRoundedRect(10, 20, 20, 24, 6);
          player.fillStyle(0xf4a261, 1);
          player.fillTriangle(26, 24, 46, 32, 26, 37);
          player.lineStyle(2, 0xffd166, 0.82);
          player.strokeCircle(20, 33, 18);
          player.generateTexture("arpg-player-sprite", 52, 54);
          player.destroy();

          const sentry = this.make.graphics({ x: 0, y: 0, add: false });
          sentry.fillStyle(0x40312d, 1);
          sentry.fillCircle(24, 24, 18);
          sentry.lineStyle(3, 0xef4444, 0.92);
          sentry.strokeCircle(24, 24, 22);
          sentry.fillStyle(0xef4444, 0.72);
          sentry.fillTriangle(24, 7, 31, 27, 17, 27);
          sentry.generateTexture("arpg-enemy-sprite", 54, 54);
          sentry.destroy();

          const boss = this.make.graphics({ x: 0, y: 0, add: false });
          boss.fillStyle(0x6b3f24, 1);
          boss.fillRoundedRect(9, 9, 46, 46, 10);
          boss.lineStyle(4, 0xd946ef, 0.9);
          boss.strokeRoundedRect(7, 7, 50, 50, 12);
          boss.fillStyle(0xffd166, 0.9);
          boss.fillCircle(32, 32, 9);
          boss.generateTexture("arpg-boss-sprite", 64, 64);
          boss.destroy();

          const loot = this.make.graphics({ x: 0, y: 0, add: false });
          loot.fillStyle(0x4b3321, 1);
          loot.fillRoundedRect(8, 20, 34, 18, 5);
          loot.fillStyle(0xffd166, 0.92);
          loot.fillTriangle(25, 4, 39, 24, 11, 24);
          loot.lineStyle(2, 0xffd166, 0.65);
          loot.strokeCircle(25, 25, 21);
          loot.generateTexture("arpg-loot-sprite", 50, 48);
          loot.destroy();

          const lore = this.make.graphics({ x: 0, y: 0, add: false });
          lore.fillStyle(0x1f2933, 1);
          lore.fillRoundedRect(12, 4, 24, 54, 5);
          lore.fillStyle(0x8ecae6, 0.52);
          lore.fillRoundedRect(17, 14, 14, 22, 4);
          lore.lineStyle(2, 0x8ecae6, 0.55);
          lore.strokeRoundedRect(12, 4, 24, 54, 5);
          lore.generateTexture("arpg-lore-sprite", 48, 64);
          lore.destroy();
        }

        drawIsoDiamond(graphics: any, x: number, y: number, width: number, height: number) {
          graphics.beginPath();
          graphics.moveTo(x, y - height / 2);
          graphics.lineTo(x + width / 2, y);
          graphics.lineTo(x, y + height / 2);
          graphics.lineTo(x - width / 2, y);
          graphics.closePath();
          graphics.fillPath();
          graphics.strokePath();
        }

        drawZone() {
          const graphics = this.add.graphics();
          graphics.fillStyle(0x1d120a, 1);
          graphics.fillRect(0, 0, 1540, 900);
          graphics.fillStyle(0x2f2118, 0.95);
          graphics.lineStyle(2, 0xd49c52, 0.16);
          this.drawIsoDiamond(graphics, WORLD_ORIGIN.x, WORLD_ORIGIN.y, 820, 520);

          ARPG_FIRST_ZONE.rooms.forEach((room, index) => {
            const point = worldToScreen(room.center.x, room.center.z);
            graphics.fillStyle(index % 2 ? 0x2b1a10 : 0x3a2414, 0.48);
            graphics.lineStyle(2, index % 2 ? 0x8ecae6 : 0xffd166, 0.18);
            this.drawIsoDiamond(
              graphics,
              point.x,
              point.y,
              210 + room.radius * 70,
              112 + room.radius * 44,
            );
          });

          graphics.lineStyle(1, 0xf4a261, 0.08);
          for (let x = -4; x <= 4; x += 1) {
            const a = worldToScreen(x, ARPG_FIRST_ZONE.spawn.z - 3.1);
            const b = worldToScreen(x, ARPG_FIRST_ZONE.spawn.z + 3.1);
            graphics.lineBetween(a.x, a.y, b.x, b.y);
          }
          for (let z = -3; z <= 3; z += 1) {
            const a = worldToScreen(-4, z);
            const b = worldToScreen(4, z);
            graphics.lineBetween(a.x, a.y, b.x, b.y);
          }

          graphics.fillStyle(0x241810, 0.92);
          graphics.lineStyle(2, 0x8ecae6, 0.18);
          const gate = worldToScreen(0.2, -2.35);
          graphics.fillRoundedRect(gate.x - 72, gate.y - 92, 144, 38, 8);
          graphics.fillRoundedRect(gate.x - 68, gate.y - 80, 26, 96, 8);
          graphics.fillRoundedRect(gate.x + 42, gate.y - 80, 26, 96, 8);
          graphics.strokeCircle(gate.x, gate.y - 34, 34);

          if (this.textures.exists(ILLUSTRATED_LOCATION_KEY)) {
            this.add
              .sprite(WORLD_ORIGIN.x - 244, WORLD_ORIGIN.y - 160, ILLUSTRATED_LOCATION_KEY, 0)
              .setScale(0.42)
              .setAlpha(0.2)
              .setDepth(1);
            this.add
              .sprite(WORLD_ORIGIN.x + 292, WORLD_ORIGIN.y + 126, ILLUSTRATED_LOCATION_KEY, 1)
              .setScale(0.34)
              .setAlpha(0.16)
              .setDepth(1);
          }

          ARPG_FIRST_ZONE.obstacles.slice(3).forEach((obstacle) => {
            const point = worldToScreen(obstacle.x, obstacle.z);
            graphics.fillStyle(0x5b4636, 0.64);
            graphics.lineStyle(1, 0xf4a261, 0.14);
            graphics.fillRoundedRect(
              point.x - obstacle.width * 36,
              point.y - obstacle.depth * 24,
              obstacle.width * 72,
              obstacle.depth * 48,
              8,
            );
          });

          this.add
            .text(WORLD_ORIGIN.x - 244, WORLD_ORIGIN.y + 214, ARPG_FIRST_ZONE.name.toUpperCase(), {
              color: "#ffd166",
              fontFamily: "monospace",
              fontSize: "12px",
              letterSpacing: 2,
            } as any)
            .setAlpha(0.62);
        }

        createInteractables() {
          Object.values(ARPG_LOOT_NODES).forEach((node) => {
            const point = worldToScreen(node.position.x, node.position.z);
            const hasIllustratedItems = this.textures.exists(ILLUSTRATED_ITEM_KEY);
            const sprite = hasIllustratedItems
              ? this.add.sprite(
                  point.x,
                  point.y - 24,
                  ILLUSTRATED_ITEM_KEY,
                  ILLUSTRATED_LOOT_FRAMES[node.itemId] ?? 11,
                )
              : this.textures.exists("arpg-item-icons")
                ? this.add.sprite(point.x, point.y - 20, "arpg-item-icons", 8)
                : this.add.sprite(point.x, point.y - 20, "arpg-loot-sprite");
            sprite.setData("nodeId", node.id);
            sprite.setScale(hasIllustratedItems ? 0.38 : this.textures.exists("arpg-item-icons") ? 0.92 : 1);
            sprite.setDepth(point.y + 6);
            this.lootSprites.set(node.id, sprite);
            if (!this.controller.getRuntime().reducedMotion) {
              this.tweens.add({
                targets: sprite,
                y: point.y - 26,
                duration: 1400,
                yoyo: true,
                repeat: -1,
                ease: "Sine.inOut",
              });
            }
          });

          Object.values(ARPG_LORE_NODES).forEach((node) => {
            const point = worldToScreen(node.position.x, node.position.z);
            const sprite = this.textures.exists(ILLUSTRATED_LOCATION_KEY)
              ? this.add.sprite(point.x, point.y - 38, ILLUSTRATED_LOCATION_KEY, 0).setScale(0.16)
              : this.add.sprite(point.x, point.y - 32, "arpg-lore-sprite");
            sprite.setData("nodeId", node.id);
            sprite.setDepth(point.y + 4);
            this.loreSprites.set(node.id, sprite);
          });
        }

        createEnemies() {
          Object.values(ARPG_ENEMIES).forEach((enemy) => {
            const point = worldToScreen(enemy.position.x, enemy.position.z);
            const profile = ARPG_ENEMY_COMBAT_PROFILES[enemy.id];
            const hasIllustratedEnemy = this.textures.exists(ILLUSTRATED_ENEMY_CARD_KEY);
            const hasSheet = this.textures.exists("arpg-enemy-sheet");
            const texture = hasIllustratedEnemy
              ? ILLUSTRATED_ENEMY_CARD_KEY
              : hasSheet
                ? "arpg-enemy-sheet"
                : enemy.id === "brass-warden"
                  ? "arpg-boss-sprite"
                  : "arpg-enemy-sprite";
            const sprite = hasIllustratedEnemy
              ? this.add.sprite(
                  point.x,
                  point.y + ENEMY_ILLUSTRATED_Y_OFFSET,
                  texture,
                  ILLUSTRATED_ENEMY_FRAMES[enemy.id] ?? profile?.spriteFrame ?? 0,
                )
              : hasSheet
                ? this.add.sprite(point.x, point.y - 24, texture, profile?.spriteFrame ?? 0)
                : this.add.sprite(point.x, point.y - 24, texture);
            const baseScale = hasIllustratedEnemy
              ? enemy.id === "brass-warden"
                ? BOSS_ILLUSTRATED_SCALE
                : ENEMY_ILLUSTRATED_SCALE
              : 1;
            sprite.setData("baseScale", baseScale);
            sprite.setScale(baseScale);
            const hpYOffset = hasIllustratedEnemy ? 88 : 62;
            const hpBar = this.add.rectangle(point.x, point.y - hpYOffset, 48, 5, 0xef4444, 0.9);
            const telegraph = this.add.circle(point.x, point.y + 2, 34, 0xfb923c, 0);
            telegraph.setStrokeStyle(2, 0xfb923c, 0.58);
            telegraph.setVisible(false);
            const statusIcon = this.textures.exists("arpg-status-icons")
              ? this.add.sprite(point.x + 25, point.y - (hasIllustratedEnemy ? 98 : 72), "arpg-status-icons", 0)
              : this.add.circle(point.x + 25, point.y - (hasIllustratedEnemy ? 98 : 72), 5, 0xffd166, 0.85);
            statusIcon.setVisible(false);
            statusIcon.setScale(0.78);
            sprite.setDepth(point.y);
            hpBar.setDepth(point.y + 1);
            telegraph.setDepth(point.y - 1);
            statusIcon.setDepth(point.y + 2);
            sprite.setInteractive({ useHandCursor: true });
            sprite.on("pointerdown", () => this.controller.target(enemy.id));
            this.enemySprites.set(enemy.id, sprite);
            this.enemyBars.set(enemy.id, hpBar);
            this.enemyTelegraphs.set(enemy.id, telegraph);
            this.enemyStatusIcons.set(enemy.id, statusIcon);
          });
        }

        createPlayer() {
          const save = this.controller.getSave();
          const spawn = worldToScreen(save.player.x, save.player.z);
          const hasIllustratedPlayer = this.textures.exists(ILLUSTRATED_OUTFIT_KEY);
          const hasPlayerSheet = this.textures.exists(PLAYER_SHEET_KEY);
          this.playerHalo = this.add.circle(spawn.x, spawn.y + 8, 31, 0xffd166, 0.12);
          this.contextRing = this.add.circle(spawn.x, spawn.y + 8, 46, 0x8ecae6, 0);
          this.contextRing.setStrokeStyle(2, 0x8ecae6, 0.48);
          this.playerSprite = hasIllustratedPlayer
            ? this.add.sprite(
                spawn.x,
                spawn.y + PLAYER_ILLUSTRATED_Y_OFFSET,
                ILLUSTRATED_OUTFIT_KEY,
                illustratedPlayerFrameForSave(save),
              )
            : hasPlayerSheet
              ? this.add.sprite(
                spawn.x,
                spawn.y + PLAYER_SHEET_Y_OFFSET,
                PLAYER_SHEET_KEY,
                playerSpriteFrameForSave(save),
              )
              : this.add.sprite(spawn.x, spawn.y + PLAYER_FALLBACK_Y_OFFSET, PLAYER_FALLBACK_KEY);
          this.playerSprite.setScale(hasIllustratedPlayer ? PLAYER_ILLUSTRATED_SCALE : hasPlayerSheet ? 0.78 : 1);
          this.playerSprite.setDepth(spawn.y + 10);
          this.cameras.main.startFollow(this.playerSprite, true, 0.12, 0.12, 0, 80);
          this.syncViewport(this.scale.width, this.scale.height);
        }

        syncViewport(width: number, height: number) {
          const mainCamera = this.cameras?.main;
          if (!mainCamera) return;

          const heightZoom = height >= 760 ? 1.34 : height >= 620 ? 1.22 : height >= 480 ? 1.1 : 1;
          const widthZoom = width >= 1280 ? 1.08 : width >= 920 ? 1.02 : 0.96;
          const zoom = Math.min(1.36, Math.max(0.94, heightZoom * widthZoom));
          mainCamera.setZoom(zoom);
          mainCamera.setLerp(0.14, 0.14);
        }

        createOraclePips() {
          for (let index = 0; index < 4; index += 1) {
            const pip = this.add.circle(0, 0, 5 - index * 0.35, 0xffd166, 0.8);
            this.oraclePips.push(pip);
          }
        }

        syncRuntime(runtime: RuntimeSnapshot) {
          const color = Phaser.Display.Color.HexStringToColor(readableAgentColor(runtime.activeAgent)).color;
          this.oraclePips.forEach((pip, index) => {
            pip.setFillStyle(color, runtime.dispatchActive || runtime.activeAgent ? 0.9 - index * 0.12 : 0.36);
          });
          if (this.playerHalo) {
            this.playerHalo.setFillStyle(color, runtime.activeAgent ? 0.2 : 0.12);
          }
        }

        syncSave(save: ArpgSaveState) {
          const profile = getArpgCharacterProfile(save);
          const classColor = parseHexColor(profile.classTree.accent, 0xf4a261);
          const paletteColor = parseHexColor(profile.palette.primary, classColor);
          const accentColor = parseHexColor(profile.palette.accent, 0xffd166);
          const point = worldToScreen(save.player.x, save.player.z);
          if (this.playerSprite) {
            const playerTextureKey = this.playerSprite.texture?.key;
            const hasIllustratedPlayer = playerTextureKey === ILLUSTRATED_OUTFIT_KEY;
            const hasPlayerSheet = playerTextureKey === PLAYER_SHEET_KEY;
            this.playerSprite.setPosition(
              point.x,
              point.y + (
                hasIllustratedPlayer
                  ? PLAYER_ILLUSTRATED_Y_OFFSET
                  : hasPlayerSheet
                    ? PLAYER_SHEET_Y_OFFSET
                    : PLAYER_FALLBACK_Y_OFFSET
              ),
            );
            this.playerSprite.setDepth(point.y + 10);
            if (hasIllustratedPlayer) {
              this.playerSprite.setFrame(illustratedPlayerFrameForSave(save));
              this.playerSprite.clearTint?.();
            } else if (hasPlayerSheet) {
              this.playerSprite.setFrame(playerSpriteFrameForSave(save));
              this.playerSprite.clearTint?.();
            } else {
              this.playerSprite.setTint(paletteColor);
            }
          }
          this.playerHalo?.setPosition(point.x, point.y + 8);
          this.contextRing?.setPosition(point.x, point.y + 8);
          this.contextRing?.setStrokeStyle(2, accentColor, 0.52);
          this.oraclePips.forEach((pip, index) => {
            const angle = Date.now() / 900 + index * 1.55;
            const radius = 36 + index * 5;
            pip.setPosition(point.x + Math.cos(angle) * radius, point.y - 28 + Math.sin(angle) * 14);
            pip.setDepth(point.y + 20 + index);
          });

          Object.values(ARPG_ENEMIES).forEach((enemy) => {
            const state = save.enemies[enemy.id];
            const sprite = this.enemySprites.get(enemy.id);
            const hpBar = this.enemyBars.get(enemy.id);
            const telegraph = this.enemyTelegraphs.get(enemy.id);
            const statusIcon = this.enemyStatusIcons.get(enemy.id);
            const hpRatio = enemy.maxHp ? Math.max(0, (state?.hp ?? 0) / enemy.maxHp) : 0;
            const hasIllustratedEnemy = sprite?.texture?.key === ILLUSTRATED_ENEMY_CARD_KEY;
            const baseScale = sprite?.getData?.("baseScale") ?? 1;
            sprite?.setAlpha(state?.defeated ? 0.22 : save.combat.targetEnemyId === enemy.id ? 1 : 0.92);
            sprite?.setScale(save.combat.targetEnemyId === enemy.id ? baseScale * 1.06 : baseScale);
            if (hasIllustratedEnemy) {
              sprite?.clearTint?.();
            } else {
              sprite?.setTint(
                state?.defeated
                  ? 0xffd166
                  : save.combat.targetEnemyId === enemy.id
                    ? accentColor
                    : state?.intent === "telegraph"
                      ? 0xfb923c
                      : 0xffffff,
              );
            }
            hpBar?.setVisible(!state?.defeated);
            hpBar?.setScale(Math.max(0.08, hpRatio), 1);
            telegraph?.setVisible(!state?.defeated && state?.intent === "telegraph");
            telegraph?.setAlpha(save.combat.reducedMotionVfx ? 0.28 : 0.58);
            const firstStatus = state?.statuses?.find((status) => status.expiresAt > Date.now());
            statusIcon?.setVisible(Boolean(firstStatus && !state?.defeated));
            if (firstStatus && this.textures.exists("arpg-status-icons")) {
              const frame = firstStatus.id === "exposed"
                ? 0
                : firstStatus.id === "staggered"
                  ? 1
                  : firstStatus.id === "burn"
                    ? 2
                    : firstStatus.id === "bleed"
                      ? 3
                      : firstStatus.id === "cracked-armor"
                        ? 12
                        : firstStatus.id === "relic-fury"
                          ? 15
                          : 0;
              statusIcon?.setFrame(frame);
            }
          });

          Object.values(ARPG_LOOT_NODES).forEach((node) => {
            const sprite = this.lootSprites.get(node.id);
            const opened = save.world.openedChests.includes(node.id);
            sprite?.setAlpha(opened ? 0.34 : 1);
            if (sprite?.texture?.key === ILLUSTRATED_ITEM_KEY) {
              sprite?.clearTint?.();
            } else {
              sprite?.setTint(opened ? 0xa7f3d0 : 0xffffff);
            }
          });

          const eventKey = `${save.lastSavedAt}:${save.lastEvent}`;
          if (this.lastEventKey !== eventKey) {
            this.lastEventKey = eventKey;
            this.flashEvent(save.lastEvent, point.x, point.y);
          }
          const combatEvent = save.combat.latestEvents[0];
          if (combatEvent && this.lastCombatEventId !== combatEvent.id) {
            this.lastCombatEventId = combatEvent.id;
            const enemy = combatEvent.enemyId ? ARPG_ENEMIES[combatEvent.enemyId] : null;
            const enemyPoint = enemy ? worldToScreen(enemy.position.x, enemy.position.z) : point;
            if (combatEvent.kind === "damage" && combatEvent.amount) {
              this.flashDamage(combatEvent.amount, enemyPoint.x, enemyPoint.y, combatEvent.damageType);
            }
          }
        }

        flashDamage(amount: number, x: number, y: number, damageType?: string) {
          const runtime = this.controller.getRuntime();
          const color =
            damageType === "ember"
              ? "#fb923c"
              : damageType === "bleed"
                ? "#ef4444"
                : damageType === "void"
                  ? "#a78bfa"
                  : "#ffe1a6";
          const text = this.add
            .text(x, y - 76, `${amount}`, {
              color,
              fontFamily: "monospace",
              fontSize: "18px",
              fontStyle: "bold",
              stroke: "#120906",
              strokeThickness: 4,
            } as any)
            .setOrigin(0.5)
            .setDepth(2200);
          this.tweens.add({
            targets: text,
            y: runtime.reducedMotion ? y - 86 : y - 118,
            alpha: 0,
            duration: runtime.reducedMotion ? 240 : 760,
            ease: "Cubic.out",
            onComplete: () => text.destroy(),
          });
        }

        flashEvent(label: string, x: number, y: number) {
          const runtime = this.controller.getRuntime();
          if (runtime.reducedMotion) return;
          const text = this.add
            .text(x, y - 92, label.slice(0, 52), {
              color: "#ffe1a6",
              fontFamily: "monospace",
              fontSize: "11px",
              backgroundColor: "rgba(20,13,8,.72)",
              padding: { x: 6, y: 3 },
            } as any)
            .setOrigin(0.5)
            .setDepth(2000);
          this.tweens.add({
            targets: text,
            y: y - 126,
            alpha: 0,
            duration: 950,
            ease: "Cubic.out",
            onComplete: () => text.destroy(),
          });
        }

        handleInteract() {
          const save = this.controller.getSave();
          const interaction = getNearestArpgInteraction(save);
          if (!interaction?.inRange) return;
          if (interaction.kind === "lore") {
            const node = ARPG_LORE_NODES[interaction.id];
            if (node) this.controller.advanceStory(node.storyFlag);
            return;
          }
          if (interaction.kind === "loot") {
            const node = ARPG_LOOT_NODES[interaction.id];
            if (!node) return;
            if (interaction.complete) {
              const entry = save.inventory.find((item) => item.itemId === node.itemId);
              if (entry) this.controller.equip(entry.instanceId);
            } else {
              this.controller.collect(node.itemId, node.id);
            }
            return;
          }
          if (interaction.kind === "travel") {
            this.controller.beginTravel(interaction.id);
            return;
          }
          this.controller.strike(interaction.id);
        }

        handleAttack() {
          const enemy = nearestLiveEnemy(this.controller.getSave());
          if (enemy) {
            this.controller.target(enemy.id);
            this.controller.strike(enemy.id);
          }
        }

        handleSkill(slot: 0 | 1) {
          const save = this.controller.getSave();
          const skillId = save.player.equippedSkillIds[slot] ?? null;
          this.controller.skill(skillId, save.combat.targetEnemyId);
        }

        handleDodge() {
          let x = 0;
          let z = 0;
          if (this.keys.left?.isDown || this.keys.arrowLeft?.isDown) x -= 1;
          if (this.keys.right?.isDown || this.keys.arrowRight?.isDown) x += 1;
          if (this.keys.up?.isDown || this.keys.arrowUp?.isDown) z -= 1;
          if (this.keys.down?.isDown || this.keys.arrowDown?.isDown) z += 1;
          const label =
            Math.abs(x) > Math.abs(z)
              ? x > 0
                ? "east"
                : "west"
              : z > 0
                ? "south"
                : "north";
          this.controller.dodge(x || z ? { x, z, label } : null);
        }

        update(time: number) {
          const activeElement = document.activeElement;
          if (activeElement && isEditableTarget(activeElement)) return;
          const Keyboard = Phaser.Input.Keyboard;
          if (
            Keyboard.JustDown(this.keys.interact) ||
            Keyboard.JustDown(this.keys.enter)
          ) {
            this.handleInteract();
          }
          if (Keyboard.JustDown(this.keys.attack)) {
            this.handleAttack();
          }
          if (Keyboard.JustDown(this.keys.skill1)) {
            this.handleSkill(0);
          }
          if (Keyboard.JustDown(this.keys.skill2)) {
            this.handleSkill(1);
          }
          if (Keyboard.JustDown(this.keys.dodge)) {
            this.handleDodge();
          }
          if (time - this.lastMoveAt < (this.controller.getRuntime().reducedMotion ? 135 : 82)) {
            return;
          }
          let x = 0;
          let z = 0;
          if (this.keys.left?.isDown || this.keys.arrowLeft?.isDown) x -= 1;
          if (this.keys.right?.isDown || this.keys.arrowRight?.isDown) x += 1;
          if (this.keys.up?.isDown || this.keys.arrowUp?.isDown) z -= 1;
          if (this.keys.down?.isDown || this.keys.arrowDown?.isDown) z += 1;
          if (!x && !z) return;
          this.lastMoveAt = time;
          const label =
            Math.abs(x) > Math.abs(z)
              ? x > 0
                ? "east"
                : "west"
              : z > 0
                ? "south"
                : "north";
          this.controller.move({ x, z, label });
        }
      }

      const scene = new FirstReliquaryScene(controller);
      sceneRef.current = scene;
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: mount,
        backgroundColor: "#140d08",
        width: mount.clientWidth || 960,
        height: mount.clientHeight || 540,
        render: {
          antialias: true,
          pixelArt: false,
        },
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [scene],
      });

      const markGameCanvas = () => {
        const canvas = mountRef.current?.querySelector("canvas");
        canvas?.setAttribute("data-testid", "arpg-phaser-canvas");
        canvas?.setAttribute("aria-label", `${ARPG_GAME_TITLE} Phaser game canvas`);
      };
      const resizeGame = () => {
        const currentMount = mountRef.current;
        const currentGame = gameRef.current;
        if (!currentMount || !currentGame?.scale) return;
        const width = Math.max(320, currentMount.clientWidth || 960);
        const height = Math.max(240, currentMount.clientHeight || 540);
        currentGame.scale.resize(width, height);
        sceneRef.current?.syncViewport?.(width, height);
        markGameCanvas();
      };
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(resizeGame);
      });
      resizeObserver.observe(mount);
      canvasObserver = new MutationObserver(markGameCanvas);
      canvasObserver.observe(mount, { childList: true, subtree: true });

      requestAnimationFrame(() => {
        resizeGame();
        markGameCanvas();
        requestAnimationFrame(markGameCanvas);
      });
    }

    void boot();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      canvasObserver?.disconnect();
      resizeObserver = null;
      canvasObserver = null;
      sceneRef.current = null;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="arpg-phaser-game"
      data-renderer="phaser"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
      }}
    />
  );
}
