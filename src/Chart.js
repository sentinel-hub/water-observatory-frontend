import React from 'react';
import moment from 'moment';
import { XYFrame } from 'semiotic';
import { Mark } from 'semiotic-mark';
import Loading from './Loading';

/** Sass variables, needed for the graph size which is a js prop */
import sassVariables from './styles/_vars.scss';
import './styles/Chart.scss';

/**
 * Used for dynamic graph heights,
 * TODO: fine tune for different monitor sizes or maybe switch
 * to height based breakpoints
 */
const graphHeights = {
  small: 200,
  medium: 220,
  large: 240,
  xlarge: 260,
  xxlarge: 280,
};

export default class Chart extends React.PureComponent {
  static defaultProps = {
    waterbody: undefined,
    contentWidth: 0,
    onDateSelect: (waterbodyId, measurementDate) => {},
    selectedMeasurementDate: undefined,
  };

  onChartPointClick = d => {
    this.props.onDateSelect(this.props.waterbody.properties.id, d.date);
  };

  tooltipContent = d => {
    // if tooltip is too far to the right, mark it with 'far-right', so we can position it differently with CSS
    return (
      <div className={`tooltip-content${d.voronoiX > this.props.contentWidth - 250 ? ' far-right' : ''}`}>
        <div>{d.date.format('YYYY-MM-DD')}</div>
      </div>
    );
  };

  svgAnnotationRules = params => {
    const { d, xScale, yScale } = params;
    if (d.type !== 'frame-hover') {
      return null;
    }
    return (
      <circle
        key="annotation-circle"
        r={8}
        style={{ fill: '#e8c26e', stroke: 'none' }}
        cx={xScale(d.x)}
        cy={yScale(d.y)}
      />
    );
  };

  /**
   * Generates an array of Dates, first day of each year i.e.
   * [ 1: Fri Jan 01 2016 00:00:00 GMT+0100 , 2: Sun Jan 01 2017 00:00:00 GMT+0100 , ...]
   */
  generateYearTicks(minDate, maxDate) {
    const firstYear = minDate.year() + 1;
    const maxYear = maxDate.year();

    let yearTicks = [];
    for (let i = firstYear; i <= maxYear; i++) {
      let d = moment({ year: i, month: 0, day: 1 }); // create a date object, for first day of the year, for each year
      yearTicks.push(d); // push date to yearTicks array
    }
    return yearTicks;
  }

  /**
   * Generates an array of Dates, first day of each measurement month
   */
  generateMonthTicks(minDate, maxDate) {
    let months = [];
    const minYear = minDate.year();
    const maxYear = maxDate.year();
    for (let y = minYear; y <= maxYear; y++) {
      // month boundaries are 0..11, except for the first and last year:
      const startMonthInYear = y === minYear ? minDate.month() : 0;
      const endMonthInYear = y === maxYear ? maxDate.month() : 11;

      for (let m = startMonthInYear; m <= endMonthInYear; m++) {
        let date = moment({ year: y, month: m, day: 1 });
        months.push(date);
      }
    }
    return months;
  }

  render() {
    const { waterbody, contentWidth, selectedMeasurementDate } = this.props;

    /** Return loader if watterbody is loading or undefined */
    if (!waterbody) {
      return (
        <div className="chart-loader">
          <Loading />
        </div>
      );
    }

    const validMeasurements = waterbody.measurements;
    if (validMeasurements.length === 0) {
      console.error('No valid measurements found.');
      return null;
    }

    const firstDate = validMeasurements[0].date;
    const lastDate = validMeasurements[validMeasurements.length - 1].date;
    const axisMinDate = firstDate.clone().startOf('month');
    const axisMaxDate = lastDate.clone().endOf('month');

    let yearTicks = this.generateYearTicks(axisMinDate, axisMaxDate);
    let monthTicks = this.generateMonthTicks(axisMinDate, axisMaxDate);

    let minLevel = 1.0;
    let maxLevel = 0.0;
    validMeasurements.forEach(m => {
      minLevel = Math.min(m.level, minLevel);
      maxLevel = Math.max(m.level, maxLevel);
    });

    const maxLevelWithPadding = maxLevel + 0.1;

    // area needs two more points; also, Semiotic assumes some data structure:
    const overlayAreaData = [
      {
        coordinates: [...validMeasurements, { date: lastDate, level: 0 }, { date: firstDate, level: 0 }],
      },
    ];

    /**
     * Compare contentWidth with sass media query breakpoints and select
     * the appropriate graph size. Since we have to pass height as a js prop
     * we can't style graph size via css and can't use %.
     */
    let currentBreakpoint = 'small'; // should be one of ['small', 'medium', 'large' ...]
    Object.keys(sassVariables).forEach(item => {
      let getPx = parseInt(sassVariables[item].replace('px', ''));
      if (getPx < contentWidth) {
        return (currentBreakpoint = item); // break out
      }
    });

    /** Graph props */
    const chartMargin = contentWidth >= parseInt(sassVariables.large.replace('px', '')) ? 40 : 0;
    const sharedProps = {
      size: [contentWidth - chartMargin, graphHeights[currentBreakpoint]],
      xAccessor: d => d.date,
      yAccessor: d => d.level * 100.0,
      xExtent: [axisMinDate, axisMaxDate],
      yExtent: [0, maxLevelWithPadding * 100],
      margin: { bottom: 60, left: 90, top: 60, right: 30 }, // otherwise axis labels are clipped on edges
    };

    return (
      <div id="chart-container">
        {/* We need a separate XYFrame for area, otherwise the points will be drawn around area */}
        <XYFrame
          {...sharedProps}
          areas={overlayAreaData}
          areaStyle={d => ({
            fillOpacity: 0.5,
            fill: '#25a8ca',
          })}
          className="overlay"
        />

        <XYFrame
          {...sharedProps}
          lines={validMeasurements}
          lineStyle={{
            stroke: '#19caeb',
            strokeWidth: 2,
          }}
          axes={[
            {
              orient: 'left',
              label: 'Surface area [%]',
            },
            {
              orient: 'bottom',
              tickValues: monthTicks,
              tickFormat: d => <text className="axis-label">{d.format('MMM')}</text>,
            },
            {
              className: 'chart-years',
              orient: 'top',
              tickValues: yearTicks,
              tickFormat: d => <text className="axis-label">{d.format('YYYY')}</text>,
            },
          ]}
          showLinePoints={true}
          customPointMark={mark => (
            <Mark markType="circle" r={mark.d.date.isSame(selectedMeasurementDate) ? '8' : '6'} />
          )}
          pointStyle={d => ({
            fill: d.x.isSame(selectedMeasurementDate) ? '#e8c26e' : '#19caeb',
            strokeWidth: 0,
          })}
          hoverAnnotation={true}
          svgAnnotationRules={this.svgAnnotationRules}
          tooltipContent={this.tooltipContent}
          customClickBehavior={this.onChartPointClick}
          baseMarkProps={{ transitionDuration: { default: 0, fill: 0 } }} // disable animation effects when changing points' colors
        />
      </div>
    );
  }
}
