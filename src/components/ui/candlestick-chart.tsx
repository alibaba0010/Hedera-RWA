"use client"

import { useEffect, useRef } from "react"
import { createChart } from "lightweight-charts"

interface CandlestickChartProps {
  data: {
    time: string
    open: number
    high: number
    low: number
    close: number
    volume?: number
  }[]
  basePrice: number
}

export function CandlestickChart({ data, basePrice }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart instance
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { type: 'solid', color: "rgb(17, 24, 39)" },
        textColor: "rgba(255, 255, 255, 0.9)",
      },
      grid: {
        vertLines: { visible: true, color: "rgba(55, 65, 81, 0.5)" },
        horzLines: { visible: true, color: "rgba(55, 65, 81, 0.5)" },
      },
    })

    // Format the data with proper timestamps
    const mainData = data.map((d) => ({
      time: Math.floor(new Date(d.time).getTime() / 1000),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    const baselineData = data.map((d) => ({
      time: new Date(d.time).toISOString().slice(0, 10), // "YYYY-MM-DD"
      value: basePrice,
    }))

    // Use addCandlestickSeries from the correct chart API
    // If you get a type error, ensure you are using the latest lightweight-charts and correct types
    // @ts-ignore
    const mainSeries = (chart as any).addCandlestickSeries({
      upColor: "rgb(34, 197, 94)",
      downColor: "rgb(239, 68, 68)",
      wickUpColor: "rgb(34, 197, 94)",
      wickDownColor: "rgb(239, 68, 68)",
      borderVisible: false,
    })

    const baselineSeries = chart.addSeries(
      {
        type: 'Line',
        color: "rgba(255, 255, 255, 0.5)",
        lineWidth: 1,
        lineStyle: 2,
      }
    )

    // Set the data
    mainSeries.setData(mainData)
    baselineSeries.setData(baselineData)

    // Add volume if available
    if (data[0]?.volume !== undefined) {
      // Use addCustomSeries for histogram/volume
      const volumeSeries = chart.addCustomSeries({
        type: 'Histogram',
        color: "rgba(55, 65, 81, 0.5)",
        priceFormat: { type: "volume" },
        overlay: true,
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      })

      const volumeData = data.map((d) => ({
        time: Math.floor(new Date(d.time).getTime() / 1000),
        value: d.volume || 0,
        color: d.close >= d.open ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
      }))

      volumeSeries.setData(volumeData)
    }

    // Fit all data into view
    chart.timeScale().fitContent()

    // Handle window resizing
    const handleResize = () => {
      chart.applyOptions({
        width: chartContainerRef.current?.clientWidth || 800,
      })
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
    }
  }, [data, basePrice])

  return <div ref={chartContainerRef} className="w-full h-[300px]" />
}