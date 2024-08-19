require('dotenv').config()
const { ActionRowBuilder, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType, ButtonBuilder, ButtonStyle } = require('discord.js');
const { searchCharts } = require('../../search-json.js');
const { getChart } = require('../../getChart.js');
const { parseBMS, chartData } = require('../../chartParser.js')
const aliases = require('../../aliases.js')
const combinedJSONDataPath = `${process.env.FILE_BASE_PATH}${process.env.FILE_NAME_COMBINED}`
const viewer = process.env.CHART_VIEWER_URL


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
                .setRequired(false))
        .addStringOption(option => 
            option
                .setName('table')
                .setDescription('Table, short or long form are both ok, ex. "stella, insane2, insane1, ude, gachimijoy, ...etc"')
                .setRequired(false))
        .addStringOption(option => 
            option
                .setName('folder')
                .setDescription('Difficulty folder, should usually be a number')
                .setRequired(false))
            ,

    /**
     * @param {Object} param0
     * @param {import('discord.js').ChatInputCommandInteraction} param0.interaction 
     */
    async execute(interaction) {
        const artist = [interaction.options.getString('artist')].filter(Boolean);
        const title = [interaction.options.getString('title')].filter(Boolean);
        const difficulty = [interaction.options.getString('difficulty')].filter(Boolean);
        const table = interaction.options.getString('table');
        const folder = interaction.options.getString('folder');
        let tableFolder = false

        if (table) {
            console.log(table, aliases[table])
            console.log(table in aliases, Object.values(aliases).includes(table))
            if (table in aliases || Object.values(aliases).includes(table)) {
                const resolvedTable = aliases[table] || table
                tableFolder = `${resolvedTable}${folder !== null ? folder : ''}`
                console.log(tableFolder)
            } else {
                return interaction.reply({
                    content: `not a valid table`,
                    ephemeral: true
                })
            }
        }

        //handle no options
        if (artist.length === 0 && title.length === 0 && difficulty.length === 0 && !tableFolder){
            return interaction.reply({
                content: 'Please provide atleast one option keyword',
                ephemeral: true
            })
        }

        try {
            const results = await searchCharts(combinedJSONDataPath, artist, title, difficulty, tableFolder)

            let currentPage = 1
            const optionsPerPage = 25;
            const totalPages = Math.ceil(results.length / optionsPerPage);
            let pageResults = []

            const selectMenu = (page) => {
                pageResults = results.slice((page - 1) * optionsPerPage, page * optionsPerPage)
                return new StringSelectMenuBuilder()
                    .setCustomId(`chart-select-${interaction.id}-${page}`)
                    .setPlaceholder('Choose a chart')
                    .addOptions(
                        pageResults.map((chart) =>
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${chart.artist} - ${chart.title} ${chart.subtitle !== null ? chart.subtitle : ''}`)
                                .setDescription(`${chart.tableString !== null ? chart.tableString : chart.aiLevel !== null ? 'AI'+chart.aiLevel : 'Unknown difficulty'}`)
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
                const chart = pageResults.find(item => item.md5 === chartmd5)
                interaction.reply({ 
                    content: 
                    `${chart.title}  ${
                        chart.tableString !== null ? chart.tableString : 
                        chart.aiLevel !== null ? 'AI'+chart.aiLevel : 
                        ''
                    }\n${chart.artist}\n${viewer}${chartmd5}`, 
                    ephemeral: true }
                )
                try {
                    const decodedData = await getChart(chartmd5)                    
                    const parsed = parseBMS(decodedData).notes
                    const chart = chartData(parsed)
                    //todo: send chart data to permutator/calc
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