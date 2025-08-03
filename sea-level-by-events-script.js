class SeaLevelChart {
  constructor(
    seaLevelData = [],
    eventsData = [],
    currentYear = new Date().getFullYear(),
    yScale,
  ) {
    this.seaLevelData = seaLevelData;
    this.eventsData = eventsData;
    this.currentYear = currentYear;
    this.minYear = 1996;
    this.maxYear = 2025;

    this.container = document.getElementById("header");
    this.margin = { top: 70, right: 30, bottom: 50, left: 80 };
    this.width = 800 - this.margin.left - this.margin.right;
    this.height = 500 - this.margin.top - this.margin.bottom;
    this.yScale = yScale;
    this.colors = {
      Monthly_MSL: "#0E87CC",
      Confidence_Band: "#FFE5B4",
      Linear_Trend: "#FA8128",
      Event_Line: "#FF4040"
    };
  }

  async getData() {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    try {
      const seaLevelData = await d3.csv(
        "virginia-key-8723214_meantrend.csv",
        (d) => {
          const monthNumber = +d.Month.trim();
          const monthName = months[monthNumber - 1];
          const year = +d.Year.trim();

          const dateObj = new Date(year, monthNumber - 1);

          return {
            year: +d.Year.trim(),
            month: monthName,
            date: dateObj,
            Monthly_MSL: +d.Monthly_MSL.trim(),
            Linear_Trend: +d.Linear_Trend.trim(),
            High_Conf: +d["High_Conf."].trim(),
            Low_Conf: +d["Low_Conf."].trim(),
          };
        },
      );

      const eventsData = await d3.csv(
        "miami-dade-storm_data.csv",
        (resData) => {
          const dateParts = resData.BEGIN_DATE.split("/");
          const month = parseInt(dateParts[0], 10);
          const day = parseInt(dateParts[1], 10);
          const yearShort = parseInt(dateParts[2], 10);

          const fullYear = yearShort < 70 ? 2000 + yearShort : 1900 + yearShort;

          const dateObject = new Date(fullYear, month - 1, day);
          const monthName = dateObject.toLocaleString("en-US", {
            month: "short",
          });
          const year = dateObject.getFullYear();

          return {
            Event_ID: +resData.EVENT_ID,
            Begin_Date: resData.BEGIN_DATE,
            month: monthName,
            year: year,
            date: dateObject,
            Event_Type: resData.EVENT_TYPE,
            Event_Narrative: resData.EVENT_NARRATIVE,
            Episode_Narrative: resData.EPISODE_NARRATIVE,
          };
        },
      );

      this.seaLevelData = seaLevelData;
      this.eventsData = eventsData;
      this.currentYear = 1996;

      this.drawChart();
      this.updateButtons();

      document
        .getElementById("next")
        .addEventListener("click", () => this.onPaginate("next"));
      document
        .getElementById("prev")
        .addEventListener("click", () => this.onPaginate("prev"));
      document
        .getElementById("first-page")
        .addEventListener("click", () => this.onPaginate("first-page"));
      document
        .getElementById("last-page")
        .addEventListener("click", () => this.onPaginate("last-page"));
    } catch (error) {
      console.log("Error fetching sea level data: ", error);
    }
  }

  drawChart() {
    document.getElementById("year-label").textContent = this.currentYear;

    // Filter to current chart year
    const data = this.seaLevelData.filter((d) => d.year === this.currentYear);

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

    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date))
      .range([0, this.width]);
    const y = this.yScale;

    // X Axis
    svg
      .append("g")
      .attr("transform", `translate(0,${this.height})`)
      .call(
        d3.axisBottom(x).ticks(data.length).tickFormat(d3.timeFormat("%b %Y")),
      );

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

    const lineMonthly = d3
      .line()
      .x((d) => x(d.date))
      .y((d) => y(d.Monthly_MSL))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const lineTrend = d3
      .line()
      .x((d) => x(d.date))
      .y((d) => y(d.Linear_Trend))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const areaConfidence = d3
      .area()
      .x((d) => x(d.date))
      .y0((d) => y(d.Low_Conf))
      .y1((d) => y(d.High_Conf))
      .curve(d3.curveCatmullRom.alpha(0.5));

    // Confidence band
    svg
      .append("path")
      .datum(data)
      .attr("fill", this.colors.Confidence_Band)
      .attr("stroke", "none")
      .attr("d", areaConfidence);

    // Linear trend line
    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", this.colors.Linear_Trend)
      .attr("stroke-width", 2)
      .attr("d", lineTrend);

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
      .attr("cx", (d) => x(d.date))
      .attr("cy", (d) => y(d.Monthly_MSL))
      .attr("r", 3)
      .attr("fill", this.colors.Monthly_MSL);

    // Group each event by month and year
    const eventsByMonth = d3.groups(
      this.eventsData.filter((e) => e.year === this.currentYear),
      (d) => `${d.month} ${d.year}`,
    );

    const parseMonthYear = d3.timeParse("%b %Y");

    eventsByMonth.forEach(([key, events]) => {
      const groupDate = parseMonthYear(key);
      const xCoord = x(groupDate);

      // Draw vertical line for each event
      svg
        .append("line")
        .attr("x1", xCoord)
        .attr("x2", xCoord)
        .attr("y1", 0)
        .attr("y2", this.height)
        .attr("stroke", this.colors.Event_Line)
        .attr("stroke-dasharray", 7,7)
        .attr("stroke-width", 1);

      events.sort((a, b) => a.date - b.date);

      const circleSpacing = 25;
      events.forEach((event, i) => {
        const yCoord = 20 + i * circleSpacing;

        // Interactive points for each events
        svg
          .append("circle")
          .attr("cx", xCoord)
          .attr("cy", yCoord)
          .attr("r", 4)
          .attr("fill", "red")
          .style("cursor", "pointer")
          .on("click", () => {});
      });
    });
  }

  onPaginate(direction) {
    if (direction === "next" && this.currentYear < this.maxYear) {
      this.currentYear++;
    } else if (direction === "prev" && this.currentYear > this.minYear) {
      this.currentYear--;
    } else if (direction === "first-page" && this.currentYear > this.minYear) {
      this.currentYear = this.minYear;
    } else if (direction === "last-page" && this.currentYear < this.maxYear) {
      this.currentYear = this.maxYear;
    }

    // Clear previous chart
    d3.select("#sea-level-chart").selectAll("*").remove();

    // Draw new chart
    this.drawChart();
    this.updateButtons();
  }

  updateButtons() {
    document.getElementById("prev").disabled = this.currentYear <= this.minYear;
    document.getElementById("next").disabled = this.currentYear >= this.maxYear;
    document.getElementById("first-page").disabled =
      this.currentYear == this.minYear;
    document.getElementById("last-page").disabled =
      this.currentYear == this.maxYear;
  }
}

const chart = new SeaLevelChart();
chart.getData();
