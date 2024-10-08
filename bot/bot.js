const fs = require('node:fs')
const path = require('node:path')
const { Client, Events, GatewayIntentBits, Collection } = require('discord.js');
require('dotenv').config()
const { initDefault } = require('./integration/ChartDataFetcher.js')
const { combineJson } = require('./data/combine.js')
const { deployCommands } = require('./deploy-commands.js')

const config = process.env
const prefix = config.PREFIX
const token = config.TOKEN

// Commented out while testing
initDefault()
    .then((response) => {
        console.log(response[0].length, response[1].length)
        console.log("EPIC")
        combineJson()
        deployCommands()
    })
    .catch((err) => {
        console.warn("Initialization was unsuccessful", err)
    })

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.once(Events.ClientReady, readyClient => {
    console.log(`${readyClient.user.tag} is online.`);
});

client.login(token);

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});