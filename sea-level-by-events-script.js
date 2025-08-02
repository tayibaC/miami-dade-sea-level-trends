class SeaLevelChart {
  constructor(
    seaLevelData = [],
    currentYear = new Date().getFullYear(),
    yScale,
  ) {
    this.seaLevelData = seaLevelData;
    this.currentYear = currentYear;

    this.margin = { top: 70, right: 30, bottom: 50, left: 80 };
    this.width = 800 - this.margin.left - this.margin.right;
    this.height = 400 - this.margin.top - this.margin.bottom;
    this.yScale = yScale;
    this.colors = {
      Monthly_MSL: "#0E87CC",
    };
  }

  async getData() {
    try {
      const seaLevelData = await d3.csv(
        "virginia-key-8723214_meantrend.csv",
        (d) => ({
          year: +d.Year.trim(),
          month: +d.Month.trim(),
          Monthly_MSL: +d.Monthly_MSL.trim(),
          Linear_Trend: +d.Linear_Trend.trim(),
          High_Conf: +d["High_Conf."].trim(),
          Low_Conf: +d["Low_Conf."].trim(),
        }),
      );

      this.seaLevelData = seaLevelData;
      this.currentYear = 1996;

      this.drawChart();
    } catch (error) {
      console.log("Error fetching sea level data: ", error);
    }
  }

  drawChart() {
    const yMin = d3.min(this.seaLevelData, (d) =>
      Math.min(d.Monthly_MSL, d.Low_Conf),
    );
    const yMax = d3.max(this.seaLevelData, (d) =>
      Math.max(d.Monthly_MSL, d.High_Conf),
    );
    const yBuffer = (yMax - yMin) * 0.1;

    this.yScale = d3
      .scaleLinear()
      .domain([yMin - yBuffer, yMax + yBuffer])
      .range([this.height, 0]);

    const svg = d3
      .select("#sea-level-chart")
      .append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    const x = d3.scaleLinear().domain([1, 12]).range([0, this.width]);
    const y = this.yScale;

    // X Axis
    svg
      .append("g")
      .attr("transform", `translate(0,${this.height})`)
      .call(d3.axisBottom(x).ticks(12).tickFormat(d3.format("d")));

    // Y Axis
    svg.append("g").call(d3.axisLeft(y));

    // Y axis label
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -this.margin.left + 15)
      .attr("x", -this.height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Sea Level (meters)");

    // X axis label
    svg
      .append("text")
      .attr("x", this.width / 2)
      .attr("y", this.height + this.margin.bottom - 10)
      .attr("text-anchor", "middle")
      .text("Month");

    // Filter to current chart year
    const data = this.seaLevelData.filter((d) => d.year === this.currentYear);

    const lineMonthly = d3
      .line()
      .x((d) => x(d.month))
      .y((d) => y(d.Monthly_MSL))
      .curve(d3.curveCatmullRom.alpha(0.5));

    // Monthly sea level line
    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", this.colors.Monthly_MSL)
      .attr("stroke-width", 2)
      .attr("d", lineMonthly);

    // Points
    svg
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.month))
      .attr("cy", (d) => y(d.Monthly_MSL))
      .attr("r", 3)
      .attr("fill", this.colors.Monthly_MSL);
  }
}

const chart = new SeaLevelChart();
chart.getData();
