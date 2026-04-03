import { NextRequest, NextResponse } from "next/server";
import {
  listAssetKits,
  listRegistryItems,
  saveAssetKit,
  saveRegistryItem,
} from "@/lib/assimilation/storage";
import type { AssetKit, RegistryItem } from "@/lib/assimilation/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const [items, kits] = await Promise.all([listRegistryItems(), listAssetKits()]);
  return NextResponse.json({ items, kits });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as
    | { item: RegistryItem; kit?: never }
    | { item?: never; kit: AssetKit };

  if ("item" in body && body.item) {
    const item = await saveRegistryItem(body.item);
    return NextResponse.json({ item });
  }
  if ("kit" in body && body.kit) {
    const kit = await saveAssetKit(body.kit);
    return NextResponse.json({ kit });
  }
  return NextResponse.json(
    { error: "Missing registry item or kit payload." },
    { status: 400 },
  );
}
