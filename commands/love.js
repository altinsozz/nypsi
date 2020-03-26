/*jshint esversion: 8 */
const { MessageEmbed } = require("discord.js");
const { getMember, getMention } = require("../utils.js");

var cooldown = new Map();

module.exports = {
    name: "love",
    description: "calculate your love with another person",
    category: "fun",
    run: async (message, args) => {

        if (!message.guild.me.hasPermission("EMBED_LINKS")) {
            return message.channel.send("❌ \ni am lacking permission: 'EMBED_LINKS'");
        }

        if (cooldown.has(message.member.id)) {
            const init = cooldown.get(message.member.id)
            const curr = new Date()
            const diff = Math.round((curr - init) / 1000)
            const time = 10 - diff

            const minutes = Math.floor(time / 60)
            const seconds = time - minutes * 60

            let remaining

            if (minutes != 0) {
                remaining = `${minutes}m${seconds}s`
            } else {
                remaining = `${seconds}s`
            }
            return message.channel.send("❌\nstill on cooldown for " + remaining );
        }

        if (args.length == 0) {
            return message.channel.send("❌\ninvalid account");
        }

        let target1;
        let target2;

        if (args.length == 1) {
            target1 = message.member;

            if (!message.mentions.members.first()) {
                target2 = getMember(message, args[0]);
            } else {
                target2 = message.mentions.members.first();
            }
        }

        if (args.length == 2) {
            if (!message.mentions.members.first()) {
                target1 = getMember(message, args[0]);
            } else {
                target1 = message.mentions.members.first();
            }

            if (getMember(message, args[1])) {
                target2 = getMember(message, args[1]);
            } else {
                target2 = getMention(message, args[1]);
            }

        }

        if (!target1 || !target2) {
            return message.channel.send("❌\ninvalid account");
        }

        cooldown.set(message.member.id, new Date());

        setTimeout(() => {
            cooldown.delete(message.member.id);
        }, 10000);

        const lovePercent = Math.ceil(Math.random() * 101) - 1;
        let loveLevel;
        let loveEmoji;
        let loveBar = "";

        if (lovePercent == 100) {
            loveLevel = "perfect!!";
            loveEmoji = "💞👀🍆🍑";
        } else if (lovePercent == 69) {
            loveLevel = "ooo 69 hehe horny";
            loveEmoji = "🍆🍑💦😩";
        } else if (lovePercent > 90) {
            loveLevel = "perfect!!";
            loveEmoji = "💞👀";
        } else if (lovePercent > 75) {
            loveLevel = "amazing!!";
            loveEmoji = "💕";
        } else if (lovePercent > 55) {
            loveLevel = "good";
            loveEmoji = "💖";
        } else if (lovePercent > 40) {
            loveLevel = "okay";
            loveEmoji = "💝";
        } else if (lovePercent > 25) {
            loveLevel = "uhh..";
            loveEmoji = "❤";
        } else {
            loveLevel = "lets not talk about it..";
            loveEmoji = "💔";
        }

        let loveBarNum = Math.ceil(lovePercent / 10) * 10;

        if (loveBarNum == 100) {
            loveBar = "**❤❤❤❤❤❤❤❤❤**";
        } else if (loveBarNum > 90) {
            loveBar = "**❤❤❤❤❤❤❤❤❤** 💔";
        } else if (loveBarNum > 80) {
            loveBar = "**❤❤❤❤❤❤❤❤** 💔💔";
        } else if (loveBarNum > 70) {
            loveBar = "**❤❤❤❤❤❤❤** 💔💔💔";
        } else if (loveBarNum > 60) {
            loveBar = "**❤❤❤❤❤❤** 💔💔💔💔";
        } else if (loveBarNum > 50) {
            loveBar = "**❤❤❤❤❤** 💔💔💔💔💔";
        } else if (loveBarNum > 40) {
            loveBar = "**❤❤❤❤** 💔💔💔💔💔💔";
        } else if (loveBarNum > 30) {
            loveBar = "**❤❤❤** 💔💔💔💔💔💔💔";
        } else if (loveBarNum > 20) {
            loveBar = "**❤❤** 💔💔💔💔💔💔";
        } else if (loveBarNum > 10) {
            loveBar = "**❤** 💔💔💔💔💔💔💔";
        } else {
            loveBar = "💔💔💔💔💔💔💔💔💔💔";
        }

        let color;

        if (message.member.displayHexColor == "#000000") {
            color = "#FC4040";
        } else {
            color = message.member.displayHexColor;
        }

        const embed = new MessageEmbed()
            .setColor(color)
            .setTitle("❤ " + target1.displayName + " ❤ " + target2.displayName + " ❤")
            .setDescription(target1 + " x " + target2)

            .addField("love level", 
            "**" + lovePercent + "**%\n" +
            loveBar + "\n\n" +
            "**" + loveLevel + "** " + loveEmoji)

            .setFooter(message.member.user.tag + " | bot.tekoh.wtf")
        
        message.channel.send(embed).catch(() => {
            return message.channel.send("❌ \ni may be lacking permission: 'EMBED_LINKS'");
         });
            

    }
};