const { ActionRowBuilder, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType, ButtonBuilder, ButtonStyle } = require('discord.js');
const { searchCharts } = require('../../search-json.js');
const { getChart } = require('../../getChart.js');
const { parseBMS, chartData } = require('../../chartParser.js')

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
                .setDescription('Difficulty name keywords')
                .setRequired(false)),
        //todo: option to search for a table&folder

    /**
     * @param {Object} param0
     * @param {import('discord.js').ChatInputCommandInteraction} param0.interaction 
     */
    async execute(interaction) {
        const artist = [interaction.options.getString('artist')].filter(Boolean);
        const title = [interaction.options.getString('title')].filter(Boolean);
        const difficulty = [interaction.options.getString('difficulty')].filter(Boolean);

        //handle no options
        if (artist.length === 0 && title.length === 0 && difficulty.length === 0){
            return interaction.reply({
                content: 'Please provide atleast one option keyword',
                ephemeral: true
            })
        }

        try {
            const results = await searchCharts(process.env.bmsDataJsonPath, artist, title, difficulty)

            let currentPage = 1
            const optionsPerPage = 25;
            const totalPages = Math.ceil(results.length / optionsPerPage);

            const selectMenu = (page) => {
                const pageResults = results.slice((page - 1) * optionsPerPage, page * optionsPerPage)
                return new StringSelectMenuBuilder()
                    .setCustomId(`chart-select-${interaction.id}-${page}`)
                    .setPlaceholder('Choose a chart')
                    .addOptions(
                        pageResults.map((chart) =>
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${chart.artist} - ${chart.title} ${chart.subtitle !== null ? chart.subtitle : ''}`)
                                .setDescription(
                                    chart.tableFolders.map(folder => 
                                        `${folder.table}${folder.level}`).join(", ") || 
                                        `${chart.aiLevel !== null ? 'AI '+chart.aiLevel : ''}` ||
                                        'File not in tables'
                                )
                                .setValue(chart.md5)
                        )
                    )
            }

            const menu = new ActionRowBuilder().addComponents(selectMenu(currentPage))

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${interaction.id}-prev`)
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`${interaction.id}-next`)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                )

            const reply = await interaction.reply({
                content: `Select a chart (Page ${currentPage} of ${totalPages})`,
                components: [menu,buttons],
                ephemeral: true
            });

            const selectMenuCollector = reply.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                filter: (i) => i.user.id === interaction.user.id,
            });

            const buttonCollector = reply.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter: (i) => i.user.id === interaction.user.id
            })

            buttonCollector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.customId.endsWith('-prev') && currentPage > 1){
                    currentPage--
                }
                if (buttonInteraction.customId.endsWith('-next') && currentPage < totalPages) {
                    currentPage++
                }
                const updatedMenu = new ActionRowBuilder().addComponents(selectMenu(currentPage))
                buttonInteraction.update({
                    content: `Select a chart (Page ${currentPage} of ${totalPages})`,
                    components: [updatedMenu, buttons],
                })
            })

            selectMenuCollector.on('collect', async (interaction) => {
                const chartmd5 = interaction.values[0];
                interaction.reply({ content: `Selected chart: ${chartmd5}`, ephemeral: true }
                )
                try {
                    const decodedData = await getChart(chartmd5)

                    const parsed = parseBMS(decodedData)
                    // const chart = chartData(parsed)
                    console.log(parsed.header)

                } catch (error) {
                    console.error('Error fetching chart data, ', error)
                }
                return
            })

            selectMenuCollector.on('end', async () => {
                await interaction.editReply({
                    components:[],
                })
            })

        } catch (error) {
            console.log(error)
        }
    },
};