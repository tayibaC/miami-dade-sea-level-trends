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
    this.minYear = 0;
    this.maxYear = 0;

    this.container = document.getElementById("header");
    this.margin = { top: 70, right: 30, bottom: 50, left: 80 };
    this.width = 800 - this.margin.left - this.margin.right;
    this.height = 500 - this.margin.top - this.margin.bottom;
    this.yScale = yScale;
    this.colors = {
      Monthly_MSL: "#0E87CC", // Orange Line
      Confidence_Band: "#FFE5B4", // Light Orange Fill
      Linear_Trend: "#FA8128", // Blue Line
      Event_Line: "#FF4040", // Red vertical dashes with cirlce
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
      this.minYear = d3.min(seaLevelData, (d) => d.year);
      this.maxYear = d3.max(seaLevelData, (d) => d.year);

      this.drawChart();
      this.renderLegend();
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

    this.renderTrendChangeAnnotation(svg);

    // Group each event by month and year
    const eventsByMonth = d3.groups(
      this.eventsData.filter((e) => e.year === this.currentYear),
      (d) => `${d.month} ${d.year}`,
    );

    const parseMonthYear = d3.timeParse("%b %Y");
    const annotationGroup = svg.append("g").attr("class", "annotations");
    let activeEventId = null; // Tracks currently shown annotation's Event_ID

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
        .attr("stroke-dasharray", 7, 7)
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
          .on("click", () => {
            if (activeEventId === event.Event_ID) {
              // Clicking the same circle again removes the annotation
              annotationGroup.selectAll("*").remove();
              activeEventId = null;
            } else {
              // Clicking a new circle removes old, render new
              annotationGroup.selectAll("*").remove();
              this.renderEventAnnotation(
                event,
                xCoord,
                yCoord,
                annotationGroup,
              );
              annotationGroup.raise();
              activeEventId = event.Event_ID;
            }
          });
      });
    });
  }

  renderTrendChangeAnnotation(svg) {
    // Compare current year to previous year's linear trend
    const currentData = this.seaLevelData.filter(
      (d) => d.year === this.currentYear,
    );
    const prevData = this.seaLevelData.filter(
      (d) => d.year === this.currentYear - 1,
    );

    const avgCurrent = d3.mean(currentData, (d) => d.Linear_Trend);
    const avgPrev = d3.mean(prevData, (d) => d.Linear_Trend);

    const diff = avgCurrent - avgPrev;
    const formattedDiff = `${diff >= 0 ? "+" : "-"}${(diff * 1000).toFixed(1)} mm`;

    // Positioning annotation at the end of the year
    const decData =
      currentData.find((d) => d.month === 12) ||
      currentData[currentData.length - 1];
    const y = this.yScale;
    const yPos = y(decData.Linear_Trend);

    const formattedLabel =
      this.currentYear === this.minYear
        ? "No previous year data"
        : `${formattedDiff} vs last year`;
    const labelColor = diff >= 0 ? "green" : "red";

    const annotation = d3
      .annotation()
      .type(d3.annotationLabel)
      .annotations([
        {
          note: {
            title: "Average Trend Change",
            label: formattedLabel,
            wrap: 200,
            style: { fill: labelColor },
          },
          x: this.width,
          y: yPos,
          dx: -40,
          dy: 30,
          subject: { radius: 4 },
          connector: {
            end: "arrow",
          },
        },
      ]);

    // Clear previous and add new annotation group
    svg.selectAll(".trend-change-annotation").remove();
    svg.append("g").attr("class", "trend-change-annotation").call(annotation);
  }

  renderLegend() {
    const legendWidth = 200;
    const legendHeight = 110;
    const lineHeight = 24;
    const padding = 10;

    const labels = {
      Monthly_MSL: "Monthly Median Sea Level",
      Confidence_Band: "Confidence Band",
      Linear_Trend: "Linear Trend",
      Event_Line: "Event Marker",
    };

    const svg = d3
      .select("#chart-legend")
      .append("svg")
      .attr("width", legendWidth)
      .attr("height", legendHeight);

    // Legend background
    svg
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .attr("fill", "#f5f5f5")
      .attr("stroke", "#ccc")
      .attr("rx", 8)
      .attr("ry", 8);

    // Draw legend items
    let index = 0;
    for (const key in this.colors) {
      const y = padding + index * lineHeight;

      if (key === "Confidence_Band") {
        // Filled rectangle
        svg
          .append("rect")
          .attr("x", 15)
          .attr("y", y)
          .attr("width", 25)
          .attr("height", 10)
          .attr("fill", this.colors[key])
          .attr("stroke", "#999");
      } else if (key === "Event_Line") {
        // Dashed red line + circle
        svg
          .append("line")
          .attr("x1", 15)
          .attr("x2", 40)
          .attr("y1", y + 6)
          .attr("y2", y + 6)
          .attr("stroke", this.colors[key])
          .attr("stroke-dasharray", "4,2")
          .attr("stroke-width", 2);

        svg
          .append("circle")
          .attr("cx", 27.5)
          .attr("cy", y + 6)
          .attr("r", 3)
          .attr("fill", this.colors[key]);
      } else {
        // Solid line for MSL and Trend
        svg
          .append("line")
          .attr("x1", 15)
          .attr("x2", 40)
          .attr("y1", y + 6)
          .attr("y2", y + 6)
          .attr("stroke", this.colors[key])
          .attr("stroke-width", 3);
      }

      // Add label text
      svg
        .append("text")
        .attr("x", 50)
        .attr("y", y + 10)
        .text(labels[key])
        .attr("font-size", "13px")
        .attr("fill", "#333");

      index++;
    }
  }

  renderEventAnnotation(event, xPos, yPos, annotationGroup) {
    const isBelowCenter = yPos > this.height / 2;
    const isRightSide = xPos > this.width / 2;

    // Clear any previous annotations
    annotationGroup.selectAll("*").remove();

    const dx = isRightSide ? -60 : 60;

    const annotation = d3
      .annotation()
      .type(d3.annotationCalloutElbow)
      .annotations([
        {
          note: { label: "", wrap: 250 },
          x: xPos,
          y: yPos,
          dx: dx,
          dy: isBelowCenter ? -80 : 80,
          subject: { radius: 6 },
        },
      ]);

    annotationGroup.call(annotation);

    // Clone HTML template
    const template = document.getElementById("annotation-template");
    const cloned = template.content.cloneNode(true);

    cloned.querySelector(".annotation-type").textContent = event.Event_Type;
    cloned.querySelector(".annotation-date").textContent = event.Begin_Date;
    cloned.querySelector(".event-narrative").textContent =
      event.Event_Narrative || "Not Available";
    cloned.querySelector(".episode-narrative").textContent =
      event.Episode_Narrative || "Not Available";

    // Append as foreignObject
    const annotationBox = annotationGroup
      .append("foreignObject")
      .attr("x", isRightSide ? xPos - 325 : xPos + 65)
      .attr("y", isBelowCenter ? yPos - 225 : yPos + 10)
      .attr("width", 260)
      .attr("height", 100)
      .attr("class", "annotation-container");

    annotationBox.node().appendChild(cloned);

    // Resize based on content height
    const content = annotationBox.select(".annotation-label").node();
    const contentHeight = content.getBoundingClientRect().height + 16;
    annotationBox.attr("height", Math.min(contentHeight, 250));
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

document.addEventListener("DOMContentLoaded", () => {
  const chart = new SeaLevelChart();
  chart.getData();
});
