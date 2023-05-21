const {
	MessageEmbed,
	isSelectMenuForUser, 
} = require("../../lib/Embed");
const fs = require("fs");
const { getCommands, getCategories } = require("../../util/getDirs");
const { ComponentType, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { capitalize } = require("../../util/string");


module.exports = {
	name: "help",
	usage: '/help <command>',
	options: [
		{
			type: 3, // "STRING"
			name: 'command',
			description: 'What command do you want to view',
			required: false,
			autocomplete: true,
		}
	],
	autocompleteOptions: () => getCommands().then((cmds) => {
		return cmds.slash.map(cmd => {
			return { name: cmd.name, value: cmd.name }
		});
	}),
	category: "misc",
	description: "Return all commands, or one specific command!",
	ownerOnly: false,
	run: async (client, interaction) => {
		const commandArg = interaction.options.getString("command");
		if (commandArg && !client.slash.has(commandArg)) {
			return interaction.reply({ 
				embeds: [new MessageEmbed()
				.setColor(client.config.embedColor)
				.setTitle("Are you sure you wrote that correctly?")
				.setDescription("No command by that name exists\nUse `/help` to get a full list of the commands")],
				ephemeral: true
			})
		} else if (client.slash.has(commandArg)) {
			return interaction.reply({ 
				embeds: [new MessageEmbed()
				.setColor(client.config.embedColor)
				.setTitle(commandArg)
				.setDescription(`${(client.slash.get(commandArg).ownerOnly ? "**(Owner Only)**" : "")}\n**Description:**\n${client.slash.get(commandArg).description}\n${(client.slash.get(commandArg).usage ? "**Usage:**\n" + client.slash.get(commandArg).usage : "")}`)
				.setFooter({ text: "For a more complete list of the available commands use `/help` without any arguments."})]
			})
		}

		//await interaction.deferReply().catch((_) => {});

		let initialEmbed = new MessageEmbed()
		.setTitle("Slash Commands")
		.setDescription("Here's a basic list of all the commands to orient yourself on the functionalities of the bot:")
		.setColor(client.config.embedColor);
		let helpMenuActionRow = new ActionRowBuilder();
		let helpSelectMenu = new StringSelectMenuBuilder()
		.setCustomId("helpSelectMenu")
		.setPlaceholder("No Category Selected")
		.addOptions([{label: "Commands Overview", value: "overview"}]);
		let categories = getCategories();
		for (const dir of categories) {
			const category = categories.find(selected => selected.category === dir.category);
			const categoryName = dir.category;
			if(category.commands.length) {
				initialEmbed.addField(capitalize(categoryName), category.commands.map(cmd => cmd.fileObject.ownerOnly ? null : `\`${cmd.commandName}\``).filter(Boolean).join(", "));
				helpSelectMenu.addOptions([
					{
						label: `${capitalize(categoryName)} commands`,
						value: categoryName
					}
				]);
			}
		}
		helpMenuActionRow.addComponents(helpSelectMenu);
		
		// when defer is active this needs to edit the previous reply instead
		const menuSelectEmbed = await interaction.reply({ embeds: [initialEmbed], components: [helpMenuActionRow] });
		
		const collector = menuSelectEmbed.createMessageComponentCollector({ isSelectMenuForUser, componentType: ComponentType.StringSelect });
	
		collector.on("collect", async (category) => {
			category = category.values[0];
			let helpCategoryEmbed = new MessageEmbed();
			if(category === "overview") {
				helpCategoryEmbed = initialEmbed;
			} else {
				const commandFiles = fs
				.readdirSync(`./commands/${category}`)
				.filter((file) => file.endsWith(".js"));
				if(!commandFiles.length) {
					await interaction.editReply({ embeds: [new MessageEmbed()
					.setDescription(`No commands found for ${category} category...
					Please select something else.`)] });
				}
				helpCategoryEmbed
				.setColor(client.config.embedColor)
				.setTitle(`${capitalize(category)} Commands`);

				for (let command of commandFiles) {
					command = command.split(".")[0];
					const slashCommand = client.slash.get(command);
					if (!slashCommand.ownerOnly)
					helpCategoryEmbed.addField(`${command}`, slashCommand.description);
				}
			}
			await interaction.editReply({ embeds: [helpCategoryEmbed] });
		});
	}
};