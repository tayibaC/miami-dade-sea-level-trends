class SeaLevelChart {
    constructor(seaLevelData = [], currentYear = new Date().getFullYear()) {
        this.seaLevelData = seaLevelData
        this.currentYear = currentYear
    }

    async getData() {
        try {
            const seaLevelData = await d3.csv("virginia-key-8723214_meantrend.csv", d => ({
                year: +d.Year.trim(),
                month: +d.Month.trim(),
                Monthly_MSL: +d.Monthly_MSL.trim(),
                Linear_Trend: +d.Linear_Trend.trim(),
                High_Conf: +d["High_Conf."].trim(),
                Low_Conf: +d["Low_Conf."].trim()
            }));

            this.seaLevelData = seaLevelData;
            this.currentYear = 1996
        } catch (error) {
            console.log('Error fetching sea level data: ', error);
        }
    }
}

const chart = new SeaLevelChart();
chart.getData();
