const { ActionRowBuilder, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType, DiscordAPIError } = require('discord.js');
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

    /**
     * @param {Object} param0
     * @param {import('discord.js').ChatInputCommandInteraction} param0.interaction 
     */
    async execute(interaction) {
        const artist = [interaction.options.getString('artist')].filter(Boolean);
        const title = [interaction.options.getString('title')].filter(Boolean);
        const difficulty = [interaction.options.getString('difficulty')].filter(Boolean);

        try {
            const results = await searchCharts(process.env.bmsDataJsonPath, artist, title, difficulty)

            console.log(results)
            
            const select = new StringSelectMenuBuilder()
                .setCustomId(interaction.id)
                .setPlaceholder('Choose a chart')
                .addOptions(
                    results.map((chart) => 
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`${chart.artist} - ${chart.title} ${chart.subtitle}`)
                            .setDescription(chart.tableFolders.map(folder => `${folder.table}${folder.level}`).join(", ") || `AI ${chart.aiLevel}` || 'File not in tables')
                            .setValue(chart.md5)
                ))

            const row = new ActionRowBuilder().addComponents(select)

            const reply = await interaction.reply({
                content: `Select a chart`,
                components: [row],
            })

            const collector = reply.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                filter: (i) => i.user.id === interaction.user.id && i.customId === interaction.id,
                time: 60_000,
            });

            collector.on('collect', (interaction) => {
                //this interaction.values is the md5 of the selected chart
                if (!interaction.values.length){
                    interaction.reply('Search cancelled')
                    return
                }
                interaction.reply(
                    `Selected chart: ${interaction.values}`
                )
            })

        } catch (error) {
            console.log(error)
        }
    },
};