const { MessageEmbed } = require("discord.js")
const { getColor } = require("../utils.js")

const cooldown = new Map()

module.exports = {
    name: "channel",
    description: "create, delete and modify channels",
    category: "moderation",
    run: async (message, args) => {
        if (cooldown.has(message.member.id)) {
            const init = cooldown.get(message.member.id)
            const curr = new Date()
            const diff = Math.round((curr - init) / 1000)
            const time = 5 - diff

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

        if (!message.member.hasPermission("MANAGE_CHANNELS")) {
            return
        }

        if (!message.guild.me.hasPermission("MANAGE_CHANNELS")) {
            return message.channel.send("❌\ni am lacking permission: 'MANAGE_CHANNELS")
        }

        const color = getColor(message.member);

        if (args.length == 0) {

            const embed = new MessageEmbed()
                .setTitle("channel help")
                .setColor(color)
                .addField("usage", "$channel create <name(s)>\n" +
                    "$channel delete <#channel(s)>\n" +
                    "$channel rename <#channel> <name>\n" +
                    "$channel nsfw <#channel>")
                .addField("help", "you can create/delete multiple channels at the same time, examples on this can be seen below")
                .addField("examples", "$channel create channel\n" +
                    "$channel create channel1 channel2 channel3\n" +
                    "$channel delete #channel1 #channel2 #channel3")
                .setFooter("bot.tekoh.wtf")

            return message.channel.send(embed).catch(() => message.channel.send("❌\n$channel <**c**reate/**del**ete/**r**ename/nsfw> <channel> (name)"))   
        }

        

        if (args[0] == "create" || args[0] == "c") {
            if (args.length == 1) {
                return message.channel.send("❌\n$channel **c**reate <name1 name2>\nexample: $channel c channel1 channel2")
            }
            args.shift()

            let channels = ""

            for (arg of args) {
                const newChannel = await message.guild.channels.create(arg)
                channels = channels + "**" + newChannel.name + "** ✅\n"
            }

            const embed = new MessageEmbed()
                    .setTitle("channel | " + message.member.user.username)
                    .setDescription(channels)
                    .setColor(color)
                    .setFooter("bot.tekoh.wtf")
            return message.channel.send(embed)
        }

        if (args[0] == "delete" || args[0] == "del") {
            if (args.length == 1) {
                return message.channel.send("❌\n$channel **del**ete <channel>")
            }

            args.shift()

            let count = 0

            message.mentions.channels.forEach(async channel => {
                count++
                await channel.delete().catch(() => {
                    return message.channel.send("❌\nunable to delete channel: " + channel.name)
                })
            })

            const embed = new MessageEmbed()
                .setTitle("channel | " + message.member.user.username)
                .setDescription("✅ **" + count + "** channels deleted")
                .setColor(color)
                .setFooter("bot.tekoh.wtf")
            return message.channel.send(embed)
        }

        if (args[0] == "rename" || args[0] == "r") {
            if (!args.length >= 3) {
                return message.channel.send("❌\n$channel **r**ename <channel> <name>")
            }
            const channel = message.mentions.channels.first()

            if (!channel) {
                return message.channel.send("❌\ninvalid channel")
            }

            args.shift()
            args.shift()

            const name = args.join("-")

            await channel.edit({name: name}).then(() => {
            }).catch(() => {
                return message.channel.send("❌\nunable to rename channel")
            })
            const embed = new MessageEmbed()
                .setTitle("channel | " + message.member.user.username)
                .setDescription("✅ channel renamed to " + name)
                .setColor(color)
                .setFooter("bot.tekoh.wtf")
            return message.channel.send(embed)
        }

        if (args[0] == "nsfw") {
            if (args.length != 2) {
                return message.channel.send("❌\n$channel nsfw <channel>")
            }

            const channel = message.mentions.channels.first()

            if (!channel) {
                return message.channel.send("❌\ninvalid channel")
            }

            let perms = true

            if (!channel.nsfw) {
                await channel.edit({nsfw: true}).catch(() => {
                    perms = false
                    return message.channel.send("❌\nunable to edit that channel")
                })
                if (!perms) {
                    return
                }
                const embed = new MessageEmbed()
                    .setTitle("channel | " + message.member.user.username)
                    .setDescription(channel.name + "\n\n✅ channel is now nsfw")
                    .setColor(color)
                    .setFooter("bot.tekoh.wtf")
                return message.channel.send(embed)
            } else {
                await channel.edit({nsfw: false}).catch(() => {
                    perms = false
                    return message.channel.send("❌\nunable to edit that channel")
                })
                if (!perms) {
                    return
                }
                const embed = new MessageEmbed()
                    .setTitle("channel")
                    .setDescription(channel + "\n\n✅ channel is no longer nsfw")
                    .setColor(color)
                    .setFooter("bot.tekoh.wtf")
                return message.channel.send(embed)
            }
        }

        return message.channel.send("❌\n$channel <**c**reate/**del**ete/**r**ename/nsfw> <channel> (name)")
    }
}