import { BaseMessageOptions, CommandInteraction, InteractionReplyOptions, Message } from "discord.js";
import { Command, NypsiCommandInteraction } from "../models/Command";
import { CustomEmbed, ErrorEmbed } from "../models/EmbedBuilders";
import { addProgress } from "../utils/functions/economy/achievements";
import { getBalance, updateBalance } from "../utils/functions/economy/balance";
import { getBoosters } from "../utils/functions/economy/boosters";
import { addInventoryItem, getInventory, setInventoryItem } from "../utils/functions/economy/inventory";
import { addItemUse } from "../utils/functions/economy/stats";
import { createUser, getItems, userExists } from "../utils/functions/economy/utils";
import { getXp, updateXp } from "../utils/functions/economy/xp";
import { percentChance } from "../utils/functions/random";
import { addCooldown, getResponse, onCooldown } from "../utils/handlers/cooldownhandler";

const cmd = new Command("fish", "go to a pond and fish", "money");

cmd.slashEnabled = true;

async function run(message: Message | (NypsiCommandInteraction & CommandInteraction)) {
  if (!(await userExists(message.member))) await createUser(message.member);

  const send = async (data: BaseMessageOptions | InteractionReplyOptions) => {
    if (!(message instanceof Message)) {
      let usedNewMessage = false;
      let res;

      if (message.deferred) {
        res = await message.editReply(data).catch(async () => {
          usedNewMessage = true;
          return await message.channel.send(data as BaseMessageOptions);
        });
      } else {
        res = await message.reply(data as InteractionReplyOptions).catch(() => {
          return message.editReply(data).catch(async () => {
            usedNewMessage = true;
            return await message.channel.send(data as BaseMessageOptions);
          });
        });
      }

      if (usedNewMessage && res instanceof Message) return res;

      const replyMsg = await message.fetchReply();
      if (replyMsg instanceof Message) {
        return replyMsg;
      }
    } else {
      return await message.channel.send(data as BaseMessageOptions);
    }
  };

  if (await onCooldown(cmd.name, message.member)) {
    const embed = await getResponse(cmd.name, message.member);

    return send({ embeds: [embed], ephemeral: true });
  }

  const inventory = await getInventory(message.member);
  const items = getItems();

  let fishingRod: string;

  if (
    inventory.find((i) => i.item == "incredible_fishing_rod") &&
    inventory.find((i) => i.item == "incredible_fishing_rod").amount > 0
  ) {
    fishingRod = "incredible_fishing_rod";
  } else if (inventory.find((i) => i.item == "fishing_rod") && inventory.find((i) => i.item == "fishing_rod").amount > 0) {
    fishingRod = "fishing_rod";
  } else if (
    inventory.find((i) => i.item == "terrible_fishing_rod") &&
    inventory.find((i) => i.item == "terrible_fishing_rod").amount > 0
  ) {
    fishingRod = "terrible_fishing_rod";
  }

  if (!fishingRod) {
    return send({
      embeds: [
        new ErrorEmbed(
          "you need a fishing rod to fish\n[how do i get a fishing rod?](https://docs.nypsi.xyz/economy/fishinghunting)"
        ),
      ],
    });
  }

  await addCooldown(cmd.name, message.member, 300);

  const fishItems = [
    "nothing",
    "nothing",
    "nothing",
    "nothing",
    "nothing",
    "nothing",
    "nothing",
    "nothing",
    "nothing",
    "nothing",
    "nothing",
    "nothing",
    "nothing",
    "nothing",
    "nothing",
    "nothing",
    "nothing",
    "nothing",
  ];

  for (const i of Array.from(Object.keys(items))) {
    if (items[i].role == "prey") continue;
    if (items[i].role == "tool") continue;
    if (items[i].role == "car") continue;
    if (items[i].role == "booster") continue;
    if (items[i].id == "crystal_heart") continue;
    if (items[i].id.includes("credit")) continue;
    if (items[i].role === "worker-upgrade" && !percentChance(20)) continue;
    if (items[i].role == "crate" && !percentChance(35)) continue;
    if (items[i].id.includes("gem") && !percentChance(0.77)) continue;

    if (
      [
        "cobblestone",
        "iron_ore",
        "gold_ore",
        "coal",
        "iron_ingot",
        "gold_ingot",
        "obsidian",
        "netherrack",
        "quartz",
        "ancient_debris",
        "netherite_scrap",
        "netherite_ingot",
      ].includes(items[i].id)
    )
      continue;
    fishItems.push(i);

    if (items[i].role === "fish") fishItems.push(i);
  }

  await addItemUse(message.member, fishingRod);

  let times = 1;

  if (fishingRod == "fishing_rod") {
    times = 2;
  } else if (fishingRod == "incredible_fishing_rod") {
    times = 3;
  }

  const boosters = await getBoosters(message.member);

  let unbreaking = false;

  for (const boosterId of boosters.keys()) {
    if (items[boosterId].boosterEffect.boosts.includes("fish")) {
      if (items[boosterId].id == "unbreaking") {
        unbreaking = true;
      } else {
        times++;
      }
    }
  }

  if (!unbreaking) {
    await setInventoryItem(message.member, fishingRod, inventory.find((i) => i.item == fishingRod).amount - 1, false);
  }

  const foundItems = new Map<string, number>();

  for (let i = 0; i < times; i++) {
    const fishItemsModified = [];

    for (const i of fishItems) {
      if (items[i]) {
        if (items[i].rarity == 4) {
          const chance = Math.floor(Math.random() * 15);
          if (chance == 4 && fishingRod == "incredible_fishing_rod") {
            if (items[i].role == "fish") {
              for (let x = 0; x < 150; x++) {
                fishItemsModified.push(i);
              }
            }
            fishItemsModified.push(i);
          }
        } else if (items[i].rarity == 3) {
          const chance = Math.floor(Math.random() * 3);
          if (chance == 2 && fishingRod != "terrible_fishing_rod") {
            if (items[i].role == "fish") {
              for (let x = 0; x < 180; x++) {
                fishItemsModified.push(i);
              }
            }
            fishItemsModified.push(i);
          }
        } else if (items[i].rarity == 2 && fishingRod != "terrible_fishing_rod") {
          if (items[i].role == "fish") {
            for (let x = 0; x < 200; x++) {
              fishItemsModified.push(i);
            }
          } else if (items[i].role == "worker-upgrade") {
            const chance = Math.floor(Math.random() * 10);

            if (chance == 7) {
              fishItemsModified.push(i);
            }
          } else {
            fishItemsModified.push(i);
          }
        } else if (items[i].rarity == 1) {
          if (items[i].role == "fish") {
            for (let x = 0; x < 280; x++) {
              fishItemsModified.push(i);
            }
          } else if (items[i].role == "worker-upgrade") {
            const chance = Math.floor(Math.random() * 10);

            if (chance == 7) {
              for (let x = 0; x < 2; x++) {
                fishItemsModified.push(i);
              }
            }
          } else {
            for (let x = 0; x < 2; x++) {
              fishItemsModified.push(i);
            }
          }
        } else if (items[i].rarity == 0 && fishingRod != "incredible_fishing_rod") {
          if (items[i].role == "fish") {
            for (let x = 0; x < 400; x++) {
              fishItemsModified.push(i);
            }
          } else {
            fishItemsModified.push(i);
          }
        }
      } else {
        fishItemsModified.push(i);
        fishItemsModified.push(i);
      }
    }

    const chosen = fishItemsModified[Math.floor(Math.random() * fishItemsModified.length)];

    if (chosen == "nothing") continue;

    if (chosen.includes("money:") || chosen.includes("xp:")) {
      if (chosen.includes("money:")) {
        const amount = parseInt(chosen.substring(6));

        await updateBalance(message.member, (await getBalance(message.member)) + amount);
        foundItems.set("money", foundItems.has("money") ? foundItems.get("money") + amount : amount);
      } else if (chosen.includes("xp:")) {
        const amount = parseInt(chosen.substring(3));

        await updateXp(message.member, (await getXp(message.member)) + amount);
        foundItems.set("xp", foundItems.has("xp") ? foundItems.get("xp") + amount : amount);
      }
    } else if (items[chosen]?.role == "fish") {
      let amount = 1;

      if (fishingRod == "terrible_fishing_rod" && items[chosen].rarity == 0) {
        amount = Math.floor(Math.random() * 1) + 1;
      } else if (fishingRod == "fishing_rod" && items[chosen].rarity < 2) {
        amount = Math.floor(Math.random() * 3) + 1;
      } else if (fishingRod == "incredible_fishing_rod") {
        amount = Math.floor(Math.random() * 4) + 1;
      }

      await addInventoryItem(message.member, chosen, amount);

      foundItems.set(chosen, foundItems.has(chosen) ? foundItems.get(chosen) + amount : amount);
    } else {
      let amount = 1;

      if (chosen == "terrible_fishing_rod" || chosen == "terrible_gun") {
        amount = 5;
      } else if (chosen == "fishing_rod" || chosen == "gun") {
        amount = 10;
      } else if (chosen == "incredible_fishing_rod" || chosen == "incredible_gun") {
        amount = 10;
      }

      await addInventoryItem(message.member, chosen, amount);

      foundItems.set(chosen, foundItems.has(chosen) ? foundItems.get(chosen) + amount : amount);
    }
  }

  const embed = new CustomEmbed(message.member, `you go to the pond and cast your **${items[fishingRod].name}**`);

  const msg = await send({ embeds: [embed] });

  const total = Array.from(foundItems.entries())
    .map((i) => (["money", "xp"].includes(i[0]) ? 0 : i[1]))
    .reduce((a, b) => a + b);

  embed.setDescription(
    `you go to the pond and cast your **${items[fishingRod].name}**\n\nyou caught${
      total > 0
        ? `: \n${Array.from(foundItems.entries())
            .map((i) => `- \`${i[1]}x\` ${items[i[0]].emoji} ${items[i[0]].name}`)
            .join("\n")}`
        : " **nothing**"
    }`
  );

  setTimeout(() => {
    msg.edit({ embeds: [embed] });
  }, 1500);

  addProgress(message.author.id, "fisher", total);
}

cmd.setRun(run);

module.exports = cmd;
