import React, { useRef, useEffect } from 'react';
import { createChart, IChartApi, LineStyle, ColorType, CandlestickData, LineData, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { StockData, PatternLine, PatternLinePoint } from '../types/types';
import { CHART_CONFIG } from '../config/config';

interface ChartProps {
  chartData: StockData[];
  patternLines: PatternLine[];
}

const Chart: React.FC<ChartProps> = ({ chartData, patternLines }) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart: IChartApi = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 500,
        layout: {
            background: { type: ColorType.Solid, color: CHART_CONFIG.COLORS.BACKGROUND },
            textColor: CHART_CONFIG.COLORS.TEXT,
        },
        grid: {
            vertLines: { color: CHART_CONFIG.COLORS.GRID },
            horzLines: { color: CHART_CONFIG.COLORS.GRID },
        },
        timeScale: {
            borderColor: CHART_CONFIG.COLORS.BORDER,
        },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: CHART_CONFIG.COLORS.CANDLESTICK.UP,
      downColor: CHART_CONFIG.COLORS.CANDLESTICK.DOWN,
      borderVisible: false,
      wickUpColor: CHART_CONFIG.COLORS.CANDLESTICK.UP,
      wickDownColor: CHART_CONFIG.COLORS.CANDLESTICK.DOWN,
    });

    const formattedCandleData: CandlestickData[] = chartData.map(item => ({
        time: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
    }));
    candlestickSeries.setData(formattedCandleData);

    patternLines.forEach(line => {
      const lineSeries = chart.addSeries(LineSeries, {
        color: line.color,
        lineWidth: 2,
        lineStyle: line.style === 'dashed' ? LineStyle.Dashed : line.style === 'dotted' ? LineStyle.Dotted : LineStyle.Solid,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      const lineData: LineData[] = line.points.map((p: PatternLinePoint) => ({ time: p.date, value: p.price }));
      lineSeries.setData(lineData);
    });

    if (chartData.length > 0) {
        chart.timeScale().fitContent();
    }

    return () => {
      chart.remove();
    };
  }, [chartData, patternLines]);

  return <div ref={chartContainerRef} style={{ position: 'relative', width: '100%', height: '500px' }} />;
};

export default Chart;
