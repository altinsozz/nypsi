import { GuildMember } from "discord.js";
import prisma from "../../../init/database";
import redis from "../../../init/redis";
import Constants from "../../Constants";
import { isBooster } from "../premium/boosters";
import { getTier } from "../premium/premium";
import { getRequiredBetForXp } from "./balance";
import { getBoosters } from "./boosters";
import { getGuildLevelByUser } from "./guilds";
import { gemBreak, getInventory } from "./inventory";
import { isPassive } from "./passive";
import { getPrestige } from "./prestige";
import { getItems } from "./utils";

export async function getXp(member: GuildMember | string): Promise<number> {
  let id: string;
  if (member instanceof GuildMember) {
    id = member.user.id;
  } else {
    id = member;
  }

  if (await redis.exists(`${Constants.redis.cache.economy.XP}:${id}`)) {
    return parseInt(await redis.get(`${Constants.redis.cache.economy.XP}:${id}`));
  }

  const query = await prisma.economy.findUnique({
    where: {
      userId: id,
    },
    select: {
      xp: true,
    },
  });

  await redis.set(`${Constants.redis.cache.economy.XP}:${id}`, query.xp);
  await redis.expire(`${Constants.redis.cache.economy.XP}:${id}`, 30);

  return query.xp;
}

export async function updateXp(member: GuildMember | string, amount: number) {
  if (amount >= 69420) return;

  let id: string;
  if (member instanceof GuildMember) {
    id = member.user.id;
  } else {
    id = member;
  }

  await prisma.economy.update({
    where: {
      userId: id,
    },
    data: {
      xp: amount,
    },
  });
  await redis.del(`${Constants.redis.cache.economy.XP}:${id}`);
}

export async function calcEarnedXp(member: GuildMember, bet: number, multiplier: number): Promise<number> {
  const requiredBet = await getRequiredBetForXp(member);

  if (bet < requiredBet) {
    return 0;
  }

  let min = 1;
  let max = 4;

  let prestige = await getPrestige(member);
  const guildLevel = await getGuildLevelByUser(member);
  const inventory = await getInventory(member);
  const tier = await getTier(member);
  const booster = await isBooster(member.user.id);

  if (booster) max += 10;
  if (guildLevel) max += guildLevel;

  if (prestige) {
    if (prestige > 20) prestige = 20;
    min += prestige / 5;
    max += prestige / 3;
  }

  min += tier;

  let betDivisor = 10_000;

  if (prestige > 5) betDivisor = 25_000;
  if (prestige > 10) betDivisor = 50_000;
  if (prestige > 20) betDivisor = 100_000;

  max += bet / betDivisor;
  max += multiplier * 1.7;

  if (await isPassive(member)) {
    if (tier > 0) {
      max -= 2.5;
      min -= 2.5;
    } else {
      max -= 5;
      min -= 5;
    }
  }

  if (inventory.find((i) => i.item === "crystal_heart")?.amount > 0) max += Math.floor(Math.random() * 7);
  if (inventory.find((i) => i.item == "white_gem")?.amount > 0) {
    const chance = Math.floor(Math.random() * 10);

    if (chance < 2) {
      max -= Math.floor(Math.random() * 7) + 1;
    } else {
      gemBreak(member.user.id, 0.007, "white_gem");
      max += Math.floor(Math.random() * 17) + 1;
    }
  } else if (inventory.find((i) => i.item == "pink_gem")?.amount > 0) {
    gemBreak(member.user.id, 0.07, "pink_gem");
    min += 3;
  }

  let earned = Math.floor(Math.random() * (max - min)) + min;

  if (min > max) earned = max;

  const boosters = await getBoosters(member);

  let boosterEffect = 0;

  const items = getItems();

  for (const boosterId of boosters.keys()) {
    if (boosterId == "beginner_booster") {
      boosterEffect += 1;
    } else if (items[boosterId].boosterEffect.boosts.includes("xp")) {
      boosterEffect += items[boosterId].boosterEffect.effect * boosters.get(boosterId).length;
    }
  }

  earned += boosterEffect * earned;

  if (earned < 0) earned = 0;

  return Math.floor(earned);
}
