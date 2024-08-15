const { SlashCommandBuilder } = require('discord.js');
const { searchCharts } = require('../../search-json.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('search')
		.setDescription('Search for a bms chart')
        .addStringOption(option => 
            option
                .setName('artist')
                .setDescription('Artist keywords')
                .setRequired(false))
        .addStringOption(option => 
            option
                .setName('title')
                .setDescription('Title keywords')
                .setRequired(false))
        .addStringOption(option =>
            option
                .setName('difficulty')
                .setDescription('Difficulty keywords')
                .setRequired(false)),

    async execute(interaction) {
        const artist = [interaction.options.getString('artist')].filter(Boolean);
        const title = [interaction.options.getString('title')].filter(Boolean);
        const difficulty = [interaction.options.getString('difficulty')].filter(Boolean);

        try {
            const results = await searchCharts(process.env.bmsDataJsonPath, artist, title, difficulty)
            console.log(results)
            await interaction.reply({content: `${results}`})
        } catch (error) {
            console.log(error)
        }
    },
};