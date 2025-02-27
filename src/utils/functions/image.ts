import { variants } from "@catppuccin/palette";
import { WholesomeImage, WholesomeSuggestion } from "@prisma/client";
import { ColorResolvable, GuildMember, WebhookClient } from "discord.js";
import ImgurClient from "imgur";
import prisma from "../../init/database";
import { NypsiClient } from "../../models/Client";
import { CustomEmbed } from "../../models/EmbedBuilders";
import { RedditJSONPost } from "../../types/Reddit";
import { logger } from "../logger";
import { addProgress } from "./economy/achievements";
import requestDM from "./requestdm";

const imgur = new ImgurClient({
  // accessToken: process.env.IMGUR_ACCESSTOKEN,
  clientId: process.env.IMGUR_CLIENTID,
  clientSecret: process.env.IMGUR_CLIENTSECRET,
  refreshToken: process.env.IMGUR_REFRESHTOKEN,
});

let uploadDisabled = false;

let uploadCount = 0;

export function runUploadReset() {
  setInterval(() => {
    uploadCount = 0;
    logger.info("imgur upload count reset");
  }, 86400000);
}

let wholesomeCache: WholesomeImage[];

export function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/.test(url);
}

export async function redditImage(post: RedditJSONPost, allowed: RedditJSONPost[]): Promise<string> {
  let image = post.data.url;

  if (image.includes("imgur.com/a/")) {
    post = allowed[Math.floor(Math.random() * allowed.length)];
    image = post.data.url;
  }

  if (image.includes("imgur") && !image.includes("gif")) {
    image = "https://i.imgur.com/" + image.split("/")[3];
    if (!isImageUrl(image)) {
      image = "https://i.imgur.com/" + image.split("/")[3] + ".gif";
    }
    return image + "|" + post.data.title + "|" + post.data.permalink + "|" + post.data.author;
  }

  if (image.includes("gfycat")) {
    const link = await fetch("https://api.gfycat.com/v1/gfycats/" + image.split("/")[3]).then((url) => url.json());

    if (link.gfyItem) {
      image = link.gfyItem.max5mbGif;
      return image + "|" + post.data.title + "|" + post.data.permalink + "|" + post.data.author;
    }
  }

  let count = 0;

  while (!isImageUrl(image)) {
    if (count >= 10) {
      logger.warn("couldnt find image @ " + post.data.subreddit_name_prefixed);
      return "lol";
    }

    count++;

    post = allowed[Math.floor(Math.random() * allowed.length)];
    image = post.data.url;

    if (image.includes("imgur.com/a/")) {
      post = allowed[Math.floor(Math.random() * allowed.length)];
      image = post.data.url;
    }

    if (image.includes("imgur") && !image.includes("gif") && !image.includes("png")) {
      image = "https://i.imgur.com/" + image.split("/")[3];
      image = "https://i.imgur.com/" + image.split("/")[3] + ".png";
      if (!isImageUrl(image)) {
        image = "https://i.imgur.com/" + image.split("/")[3] + ".gif";
        return image + "|" + post.data.title + "|" + post.data.permalink + "|" + post.data.author;
      }
    }

    if (image.includes("gfycat")) {
      const link = await fetch("https://api.gfycat.com/v1/gfycats/" + image.split("/")[3]).then((url) => url.json());

      if (link) {
        image = link.gfyItem.max5mbGif;
        return image + "|" + post.data.title + "|" + post.data.permalink + "|" + post.data.author;
      }
    }
  }

  let title = post.data.title;

  if (title.length >= 150) {
    const a = title.split("");
    let newTitle = "";
    let count = 0;

    for (const char of a) {
      if (count == 145) {
        newTitle = newTitle + "...";
        break;
      } else {
        count++;
        newTitle = newTitle + char;
      }
    }

    title = newTitle;
  }

  return image + "|" + title + "|" + post.data.permalink + "|" + post.data.author;
}

export async function suggestWholesomeImage(submitter: GuildMember, image: string): Promise<boolean> {
  const query1 = await prisma.wholesomeImage.findUnique({
    where: {
      image: image,
    },
    select: {
      id: true,
    },
  });

  if (query1) {
    return false;
  }

  const query2 = await prisma.wholesomeSuggestion.findUnique({
    where: {
      image: image,
    },
    select: {
      id: true,
    },
  });

  if (query2) {
    return false;
  }

  const { id } = await prisma.wholesomeSuggestion.create({
    data: {
      image: image,
      submitter: submitter.user.tag,
      submitterId: submitter.user.id,
      uploadDate: new Date(),
    },
  });

  const embed = new CustomEmbed()
    .setColor(variants.latte.base.hex as ColorResolvable)
    .setTitle("wholesome suggestion #" + id);

  embed.setDescription(`**submitter** ${submitter.user.tag} (${submitter.user.id})\n**url** ${image}`);

  embed.setFooter({ text: "$ws review" });

  embed.setImage(image);

  const hook = new WebhookClient({ url: process.env.WHOLESOME_HOOK });

  await hook.send({ embeds: [embed] });
  hook.destroy();

  return true;
}

export async function acceptWholesomeImage(id: number, accepter: GuildMember, client: NypsiClient): Promise<boolean> {
  const query = await prisma.wholesomeSuggestion.findUnique({
    where: {
      id: id,
    },
  });

  if (!query) return false;

  await prisma.wholesomeImage.create({
    data: {
      image: query.image,
      submitter: query.submitter,
      submitterId: query.submitterId,
      uploadDate: query.uploadDate,
      accepterId: accepter.user.id,
    },
  });

  await prisma.wholesomeSuggestion.delete({
    where: {
      id: id,
    },
  });

  clearWholesomeCache();

  addProgress(query.submitterId, "wholesome", 1);
  logger.info(`${query.image} by ${query.submitterId} accepted by ${accepter.user.id}`);

  await requestDM({
    memberId: query.submitterId,
    client: client,
    content: `your wholesome image (${query.image}) has been accepted`,
  });

  return true;
}

export async function denyWholesomeImage(id: number, staff: GuildMember) {
  const d = await prisma.wholesomeSuggestion.delete({
    where: {
      id: id,
    },
  });

  if (!d) {
    return false;
  }

  logger.info(`${d.image} by ${d.submitterId} denied by ${staff.user.id}`);

  return true;
}

export async function getWholesomeImage(id?: number): Promise<WholesomeImage> {
  if (id) {
    const query = await prisma.wholesomeImage.findUnique({
      where: {
        id: id,
      },
    });
    return query;
  } else {
    if (wholesomeCache) {
      return wholesomeCache[Math.floor(Math.random() * wholesomeCache.length)];
    } else {
      const query = await prisma.wholesomeImage.findMany();

      wholesomeCache = query;

      return wholesomeCache[Math.floor(Math.random() * wholesomeCache.length)];
    }
  }
}

export function clearWholesomeCache() {
  wholesomeCache = undefined;
}

export async function deleteFromWholesome(id: number) {
  const query = await prisma.wholesomeImage.delete({
    where: {
      id: id,
    },
  });

  clearWholesomeCache();

  if (query) {
    return true;
  } else {
    return false;
  }
}

export async function getAllSuggestions(): Promise<WholesomeSuggestion[]> {
  const query = await prisma.wholesomeSuggestion.findMany();

  return query;
}

export async function uploadImageToImgur(url: string): Promise<string> {
  let fallback = false;

  if (uploadCount >= 775) fallback = true;
  if (uploadDisabled) fallback = true;
  let fail = false;

  logger.info(`uploading ${url}`);
  const boobies = await imgur
    .upload({
      image: url,
    })
    .catch((e) => {
      logger.error("error occured uploading image to imgur");
      logger.error("imgur error", e);
      fail = true;
    });

  if (fail) {
    uploadDisabled = true;

    setTimeout(() => {
      uploadDisabled = false;
    }, 1800000);

    fallback = true;
  }

  if (fallback || !boobies || typeof boobies?.data?.link != "string") {
    uploadDisabled = true;

    setTimeout(() => {
      uploadDisabled = false;
    }, 1800000);

    fallback = true;
    logger.info("using fallback uploader..");

    const res = await fallbackUpload(url);

    if (!res) {
      logger.error("fallback upload failed");
      return null;
    }

    logger.info(`uploaded (${res})`);

    return res;
  }

  logger.info(`uploaded (${boobies.data.link})`);
  return boobies.data.link;
}

export async function fallbackUpload(url: string): Promise<string> {
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_TOKEN}&image=${url}`).then((res) =>
    res.json()
  );

  return res.data.url;
}
