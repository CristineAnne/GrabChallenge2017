$(document).ready(function() {
	$('#loadingModal').modal('show');
	});


d3.csv("DataSeerGrabPrizeData1.csv", function makeGraphs(error, recordsJson) {
     console.log(error);
    var records = recordsJson;
	
    var dateFormat = d3.time.format("%Y-%m-%d")
	var fudge = 40;
	
    records.forEach(function(d){
        d["date"] = dateFormat.parse(d["date"]);
		d["puplong"] = +d["puplong"];
		d["puplat"] = +d["puplat"];
    });


//Dimensions
    var ndx = crossfilter(records),
		sourceDim = ndx.dimension(function(d){return d["source"];}),
		dateDim = ndx.dimension(function(d){return d["date"]; }),
		weekdayDim = ndx.dimension(function(d){return d["weekday"]; }),
		hourDim = ndx.dimension(function(d){return d["hour"];}),
		fareDim = ndx.dimension(function(d){return d["fare"];}),
		cityDim = ndx.dimension(function(d){return d["city_mod"];}),
		stateDim = ndx.dimension(function(d){return d["state"];}),
		classificationDim = ndx.dimension(function(d){return d["classification"]; }),
		allDim = ndx.dimension(function(d){return d;}),
		dayhourDim = ndx.dimension(function(d) {return [d.hour, d.weekday];}),
		pickuplatlongDim = ndx.dimension(function (d) {return (d.pick_up_latlong);}),
		dropofflatlongDim = ndx.dimension(function (d) {return (d.drop_off_latlong);}),
		pickupDistanceDim = ndx.dimension(function (d) {return (d.pick_up_distance_mod);}),
		tarvelDistanceDim = ndx.dimension(function (d) {return (d.pickup_dropoff_dist_mod);});		
//		locationDim = ndx.dimension(function (d) {return d["pick_up_location"]; });
	
 
 // Add and count values of a column
        function reduceAdd(attr) {
            return function(p,v) {
                    ++p.count
					if(v[attr] != "") {
						++p.count2;
						p.sums += v[attr] ;}
					if (v[attr] < p.min)
						p.min = v[attr]
					if (v[attr] > p.max)
						p.max = v[attr]
                return p;
            };
        }
        function reduceRemove(attr) {
            return function(p,v) {
                    --p.count
					if(v[attr] != null){
						p.sums -= v[attr] ;
						--p.count2;}
                return p;
            };
        }

  //count occurence of a condition within a column
        function reduceAddAvg(attr, cond) {
            return function(p,v) {
                    ++p.count
						if (v[attr] != cond)
							p.sums += 1 ;
                return p;
            };
        }
        function reduceRemoveAvg(attr, cond) {
            return function(p,v) {
                    --p.count
						if (v[attr] != cond)
							p.sums -= 1 ;
                return p;
            };
        }
        function reduceInit() {
          return {count:0, count2:0, sums:0, min :0, max:0};
        };

 //Add axis label
	function AddXAxis(chartToUpdate, displayText)
{
		chartToUpdate.svg()
				.append("text")
                .attr("class", "x-axis-label")
                .attr("text-anchor", "middle")
                .attr("x", chartToUpdate.width()/2)
                .attr("y", chartToUpdate.height()-3.5)
                .text(displayText);
}

	function AddYAxis(chartToUpdate, displayText)
{
		chartToUpdate.svg()
                .append("text")
                .attr("class", "y-axis-label")
                .attr("text-anchor", "middle")
                .attr("x", 0)
                .attr("y", chartToUpdate.height()/2)
                .text(displayText);

}		
 //Pie Chart and Heatmap width size
	function widthsize(window_width, type) {
		switch(type) {
			case "pie":
				if(window_width < 1056)
					width = window_width - 60;
				else
					width = window_width/4;
				break;
			case "heatmap":
				if(window_width < 1056)
					width = window_width - 100;
				else
					width = window_width/2 + 75;
				break;
			case "others2":
				if(window_width < 1056)
					width = window_width - 100;
				else
					width = window_width/3 - 60;
				break;
			case "others":
					width = window_width - 100;
			
	}
		return width
	}
		
 //Groups
    var recordsByDate = dateDim.group().reduceCount(),	
		classificationGroup = classificationDim.group(),
		allAllocatedGroup = allDim.group().reduce(reduceAddAvg("state", "UNALLOCATED"), reduceRemoveAvg("state", "UNALLOCATED"), reduceInit),
		allCompletedGroup = allDim.group().reduce(reduceAddAvg("state", "COMPLETED"), reduceRemoveAvg("state", "COMPLETED"), reduceInit),
		allGroup = ndx.groupAll().reduceCount(),
		fareGroup = allDim.group().reduce(reduceAdd("fare"), reduceRemove("fare"), reduceInit),	
		minFare = fareDim.bottom(1)[0]["fare"],
		maxFare = fareDim.top(1)[0]["fare"],
		minDate = dateDim.bottom(1)[0]["date"],
		maxDate = dateDim.top(1)[0]["date"],
		sourceGroup = sourceDim.group(),
		cityGroup = cityDim.group(),
		stateGroup = stateDim.group(),
		dayhourGroup = dayhourDim.group().reduce(reduceAdd("fare"),reduceRemove("fare"), reduceInit),
//		locationGroup = locationDim.group().reduceCount(),
		pickuplatlongGroup = pickuplatlongDim.group().reduceCount(),
		dropofflatlongGroup = dropofflatlongDim.group().reduceCount(),
		pickupDistanceGroup = pickupDistanceDim.group(),
		tarvelDistanceGroup = tarvelDistanceDim.group(),
		all = ndx.groupAll();

//Charts
    var timeChart = dc.lineChart("#time-chart"),
		allocationRate = dc.numberDisplay("#num-allocation-rate-nd"),
		actualAllocationRate = dc.numberDisplay("#num-actual-allocation-rate-nd"),
		countData = dc.numberDisplay("#num-count-nd"),
		classificationChart = dc.pieChart("#classification-chart")
		navTimeChart = dc.barChart("#nav-time-chart"),
		sourceChart = dc.rowChart("#source-chart"),
		cityChart = dc.rowChart("#city-chart"),
		stateChart = dc.rowChart("#state-chart"),
		dayhourChart = dc.heatMap("#dayhour-heat-chart"),
		fareAveChart = dc.numberDisplay('#num-fare-ave-chart'),
		pickup_marker = dc.leafletMarkerChart("#map2"),
		dropoff_marker = dc.leafletMarkerChart("#map3"),
		pickup_distance = dc.rowChart("#pickupdistance-Chart"),
		travel_distance = dc.rowChart("#travel-Chart");

	fareAveChart
		.formatNumber(d3.format(".g"))
        .valueAccessor(function (d) {
    	    return (d.value.sums/d.value.count2).toFixed(3);
    	})
		.group(fareGroup);

	sourceChart
        .width(widthsize(window.innerWidth, "heatmap")/2)
        .height(window.innerHeight/3 + 50)
        .margins({top:0, right: 30, bottom: 50, left: 30})
        .dimension(sourceDim)
        .group(sourceGroup)
        .elasticX(true)
		.colors('#00ba51')
//        .labelOffsetY(10)
        .xAxis().ticks(4);

	cityChart
        .width(widthsize(window.innerWidth, "heatmap")/2)
        .height(window.innerHeight/3 + 50)
        .margins({top:0, right: 30, bottom: 50, left: 30})
        .dimension(cityDim)
        .group(cityGroup)
        .elasticX(true)
		.colors('#00ba51')
        .xAxis().ticks(4);
		
	stateChart
        .width(widthsize(window.innerWidth, "heatmap")/2 - 40)
        .height(window.innerHeight/4 + 20)
        .margins({top:0, right: 0, bottom: 0, left: 0})
        .dimension(stateDim)
        .group(stateGroup)
        .elasticX(true)
		.colors('#00ba51')
        .xAxis().ticks(4);
    
	dayhourChart
		.width(widthsize(window.innerWidth, "heatmap"))
        .height(window.innerHeight/2-fudge)
        .margins({top:20, right: 20, bottom: 30, left: 40})
		.dimension(dayhourDim)
		.group(dayhourGroup)
		.rows(["Sun","Mon","Tues","Wed", "Thurs", "Fri", "Sat"])
		.rowOrdering(null)
		.cols(["12MN","1AM","2AM","3AM", "4AM", "5AM", "6AM", "7AM", "8AM", "9AM", "10AM", "11AM", "12NN", "1PM","2PM","3PM", "4PM", "5PM", "6PM", "7PM", "8PM", "9PM", "10PM", "11PM"])
		.colOrdering(null)
		.keyAccessor(function(d) { return d.key[0]; })
		.valueAccessor(function(d) { return d.key[1]; })
		.colorAccessor(function(d) { return +d.value.count; })
		.title(function(d) {
			return "Hour:   " + d.key[0] + "\n" +
				   "Day of the Week:  " + d.key[1] + "\n" +
				   "Count: " + (d.value.count) + "\n" +
				   "Average Fare:" + (d.value.sums/d.value.count2);})
		.colors(["#FFFFE5", "#F7FCB9", "#D9F0A3", "#ADDD8E", "#78C679", "#41AB5D", "#238443", "#006837", "#004529"])
		.calculateColorDomain();
	dayhourChart.xBorderRadius(0);
    dayhourChart.yBorderRadius(0);

	allocationRate
		.formatNumber(d3.format(".g"))
        .valueAccessor(function (d) {
    	    return (d.value.sums/d.value.count).toFixed(3);
    	})
		.group(allAllocatedGroup);

    actualAllocationRate
		.formatNumber(d3.format(".g"))
        .valueAccessor(function(d){
            return ((d.value.count-d.value.sums)/d.value.count).toFixed(3);
        })
        .group(allCompletedGroup)

    countData
		.formatNumber(d3.format(","))
        .valueAccessor(function(d){
            return d;
        })
        .group(allGroup)

	timeChart
        .width(widthsize(window.innerWidth, "others"))
        .height(225)
        .margins({top:30, right: 30, bottom: 20, left: 40})
		.dimension(dateDim)	
        .x(d3.time.scale().domain([minDate, maxDate]))
		.colors('#00ba51')
		//.legend(dc.legend().x(70).y(10).itemHeight(13).gap(5))
		.transitionDuration(1000)
		.rangeChart(navTimeChart)
		.elasticY(true)
		.brushOn(false)
		.mouseZoomable(true)
		.renderHorizontalGridLines(true)
		.group(recordsByDate);
	
    navTimeChart
        .width(widthsize(window.innerWidth, "others2"))
        .height(40)
        .margins({left: 0, top: 0, right: 0, bottom: 20})
		.colors('#00ba51')
        .x(d3.time.scale().domain([minDate, maxDate]))
        .brushOn(true)
		.elasticY(true)
	//	.round(d3.time.month.round)
	//	.xUnits(d3.time.months)
        .dimension(dateDim)
        .group(recordsByDate);

	classificationChart
		.width(widthsize(window.innerWidth, "pie"))
        .height(225)
		.dimension(classificationDim)
		.group(classificationGroup)
		.slicesCap(4)
			.innerRadius(25)
			.legend(dc.legend())
			// workaround for #703: not enough data is accessible through .label() to display percentages
			.on('pretransition', function(chart) {
				chart.selectAll('text.pie-slice').text(function(d) {
					return d.data.key + ' ' + dc.utils.printSingleValue((d.endAngle - d.startAngle) / (2*Math.PI) * 100) + '%';
				})
			});
			
	var colorScale = d3.scale.ordinal().domain(["Normal", "Anomalous"])
		.range(["#00ba51", "#ADDD8E"]);

	classificationChart.colors(colorScale)	

    var map = L.map('map', trackResize = true);

	var drawMap = function(){

	    map.setView([12.94, 122], 5);
		mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
		L.tileLayer(
			'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; ' + mapLink + ' Contributors',
				maxZoom: 15,
			}).addTo(map);
	
	//HeatMap
		var geoData = [];
		_.each(allDim.top(Infinity), function (d) {
			geoData.push([d["puplat"], d["puplong"], 1]);
	      });
		var heat = L.heatLayer(geoData,{
			radius: 10,
			blur: 20, 
			maxZoom: 1,
		}).addTo(map);

	};

		
	//Draw Map
	drawMap();

	//Update the heatmap if any dc chart get filtered
	dcCharts = [timeChart, classificationChart, navTimeChart, sourceChart, cityChart, stateChart, dayhourChart];

	_.each(dcCharts, function (dcChart) {
		dcChart.on("filtered", function (chart, filter) {
			map.eachLayer(function (layer) {
				map.removeLayer(layer)
			}); 
			drawMap();
		});
	});
	
	pickup_distance
        .width(widthsize(window.innerWidth, "heatmap")*5/8)
        .height(window.innerHeight/2 + 50)
        .margins({top:10, right: 10, bottom: 20, left: 25})
        .dimension(pickupDistanceDim)
        .group(pickupDistanceGroup)
        .elasticX(true)
		.colors('#00ba51')
//        .labelOffsetY(10)
        .xAxis().ticks(4);

	travel_distance
        .width(widthsize(window.innerWidth, "heatmap")*5/8)
        .height(window.innerHeight/2 + 50)
        .margins({top:10, right: 10, bottom: 20, left: 25})
        .dimension(tarvelDistanceDim)
        .group(tarvelDistanceGroup)
        .elasticX(true)
		.colors('#00ba51')
        .xAxis().ticks(4);


	pickup_marker
        .dimension(pickuplatlongDim)
        .group(pickuplatlongGroup)
        .width(600)
        .height(400)
        .fitOnRender(true)
        .fitOnRedraw(true)
//        .popupOnHover(true)
        .cluster(true);
			  
    dropoff_marker
        .dimension(dropofflatlongDim)
        .group(dropofflatlongGroup)
        .width(600)
        .height(400)
        .fitOnRender(true)
        .fitOnRedraw(true)
 //       .popupOnHover(true)
        .cluster(true);

	travel_distance.ordering(function(d) {
		if(d.key == "(0KM-3KM]") return 0;
		else if(d.key == "(3KM-6KM]") return 1;
		else if(d.key == "(6KM-9KM]") return 2;
		else if(d.key == "(9KM-12KM]") return 3;
		else if(d.key == "(12KM-15KM]") return 4;
		else if(d.key == "(15KM-18KM]") return 5;
		else if(d.key == "(18KM-21KM]") return 6;
		else if(d.key == ">21KM") return 7;
	});
	
	dc.renderAll();
    console.log("End!");
	
	
	window.onresize = function() {

		dayhourChart
            .width(widthsize(window.innerWidth, "heatmap"))
            .height(window.innerHeight/2-fudge)
			.redraw();
		classificationChart
            .width(widthsize(window.innerWidth, "pie"))
			.redraw();
		pickup_distance
	        .width(widthsize(window.innerWidth, "heatmap")/3)
			.redraw();
		travel_distance
			.width(widthsize(window.innerWidth, "heatmap")/3)
			.redraw();
		charts2 = [cityChart, sourceChart, stateChart]
		for (let re of charts2) {
		re
			.width(widthsize(window.innerWidth, "heatmap")*5/12)
			.redraw();
		}
		
		charts = [timeChart, navTimeChart]
		for (let re of charts) {
		_bbox1 = re.root().node().parentNode.getBoundingClientRect();
		re.width(_bbox1.width).render();				
		}
	};	

	$('#loadingModal').modal('hide');

/*	$(function() {
        $('*[class^="chart"]').matchHeight();
    });     
    
    $(function() {
        $('*[class^="cont"]').matchHeight();
    });*/
})
