//Desarrollo de las visualizaciones
import * as d3 from 'd3';
import { numberWithCommas3 } from '../helpers';
import { getInTooltip, getOutTooltip, positionTooltip } from '../modules/tooltip';
import { setChartHeight } from '../modules/height';
import { setChartCanvas, setChartCanvasImage } from '../modules/canvas-image';
import { setRRSSLinks } from '../modules/rrss';
import { setFixedIframeUrl } from './chart_helpers';

//Colores fijos
const COLOR_PRIMARY_1 = '#F8B05C',
COLOR_ANAG_PRIM_1 = '#BA9D5F', 
COLOR_ANAG_PRIM_2 = '#9E6C51',
COLOR_ANAG_PRIM_3 = '#9E3515';
let tooltip = d3.select('#tooltip');

//Diccionario
let dictionary = {
    solteros_porc: 'Solteros/as',
    casados_porc: 'Casados/as',
    viudos_porc: 'Viudos/as',
    separados_porc: 'Separados o divorciados'   
};

export function initChart() {
    //Desarrollo del gráfico
    d3.csv('https://raw.githubusercontent.com/CarlosMunozDiazCSIC/informe_perfil_mayores_2022_social_4_2/main/data/estado_civil_65_1970_2020_csv.csv', function(error,data) {
        if (error) throw error;

        let margin = {top: 12.5, right: 30, bottom: 25, left: 35},
            width = document.getElementById('chart').clientWidth - margin.left - margin.right,
            height = document.getElementById('chart').clientHeight - margin.top - margin.bottom;

        let svg = d3.select("#chart")
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let estados = data.columns.slice(7);
        let periodos = d3.map(data, function(d){return(d.Periodo)}).keys();

        let x = d3.scaleBand()
            .domain(periodos)
            .range([0, width])
            .padding(0.2);
        
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x).tickSize(0));

        let y = d3.scaleLinear()
            .domain([0, 65])
            .range([ height, 0 ]);

        let yAxis = function(svg) {
            svg.call(d3.axisLeft(y).ticks(6).tickFormat(function(d,i) { return numberWithCommas3(d); }));
            svg.call(function(g) {
                g.call(function(g){
                    g.selectAll('.tick line')
                        .attr('class', function(d,i) {
                            if (d == 0) {
                                return 'line-special';
                            }
                        })
                        .attr('x1', '0%')
                        .attr('x2', `${width}`)
                });
            });
        }

        svg.append("g")
            .attr("class", "yaxis")
            .call(yAxis);

        let xSubgroup = d3.scaleBand()
            .domain(estados)
            .range([0, x.bandwidth()])
            .padding([0.05]);
        
        let color = d3.scaleOrdinal()
            .domain(estados)
            .range([COLOR_PRIMARY_1, COLOR_ANAG_PRIM_1, COLOR_ANAG_PRIM_2, COLOR_ANAG_PRIM_3]);

        function init() {
            svg.append("g")
                .selectAll("g")
                .data(data)
                .enter()
                .append("g")
                .attr("transform", function(d) { return "translate(" + x(d.Periodo) + ",0)"; })
                .attr('class', function(d) {
                    return 'grupo-' + d.Periodo;
                })
                .selectAll("rect")
                .data(function(d) { return estados.map(function(key) { return {key: key, value: d[key]}; }); })
                .enter()
                .append("rect")
                .attr('class', function(d) {
                    return 'rect rect_' + d.key;
                })
                .attr("x", function(d) { return xSubgroup(d.key); })
                .attr("y", function(d) { return y(0); })
                .attr("width", xSubgroup.bandwidth())
                .attr("height", function(d) { return 0; })
                .attr("fill", function(d) { return color(d.key); })
                .on('mouseover', function(d,i,e) {
                    //Opacidad en barras
                    let css = e[i].getAttribute('class').split(' ')[1];
                    let bars = svg.selectAll('.rect');                    
            
                    bars.each(function() {
                        this.style.opacity = '0.4';
                        let split = this.getAttribute('class').split(" ")[1];
                        if(split == `${css}`) {
                            this.style.opacity = '1';
                        }
                    });

                    //Tooltip > Recuperamos el año de referencia
                    let currentYear = this.parentNode.classList[0];

                    let html = '<p class="chart__tooltip--title">' + dictionary[d.key] + '</p>' + 
                        '<p class="chart__tooltip--text">En <b>' + currentYear.split('-')[1] + '</b>, el <b>' + numberWithCommas3(parseFloat(d.value).toFixed(1)) + '%</b> de las personas con 65 o más años tiene este estado civil</p>';
                    
                    tooltip.html(html);

                    //Tooltip
                    positionTooltip(window.event, tooltip);
                    getInTooltip(tooltip);

                })
                .on('mouseout', function(d,i,e) {
                    //Quitamos los estilos de la línea
                    let bars = svg.selectAll('.rect');
                    bars.each(function() {
                        this.style.opacity = '1';
                    });
                
                    //Quitamos el tooltip
                    getOutTooltip(tooltip); 
                })
                .transition()
                .duration(2000)
                .attr("y", function(d) { return y(+d.value); })
                .attr("height", function(d) { return height - y(+d.value); });
        }

        function animateChart() {
            svg.selectAll('.rect')
                .attr("x", function(d) { return xSubgroup(d.key); })
                .attr("y", function(d) { return y(0); })
                .attr("width", xSubgroup.bandwidth())
                .attr("height", function(d) { return 0; })
                .attr("fill", function(d) { return color(d.key); })
                .transition()
                .duration(2000)
                .attr("y", function(d) { return y(+d.value); })
                .attr("height", function(d) { return height - y(+d.value); });
        }

        /////
        /////
        // Resto - Chart
        /////
        /////
        init();

        //Animación del gráfico
        document.getElementById('replay').addEventListener('click', function() {
            animateChart();

            setTimeout(() => {
                setChartCanvas();
            }, 4000);
        });

        /////
        /////
        // Resto
        /////
        /////

        //Iframe
        setFixedIframeUrl('informe_perfil_mayores_2022_social_4_2','evolucion_estado_civil');

        //Redes sociales > Antes tenemos que indicar cuál sería el texto a enviar
        setRRSSLinks('evolucion_estado_civil');

        //Captura de pantalla de la visualización
        setTimeout(() => {
            setChartCanvas();
        }, 4000);

        let pngDownload = document.getElementById('pngImage');

        pngDownload.addEventListener('click', function(){
            setChartCanvasImage('evolucion_estado_civil');
        });

        //Altura del frame
        setChartHeight();
    });    
}