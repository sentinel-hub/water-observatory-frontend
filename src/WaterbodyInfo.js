import React from 'react';

import './styles/WaterbodyInfo.scss';
import Loading from './Loading';

const Info = props => (
  <div className="infobox">
    <div className="value">{props.value}</div>
    <label>{props.label}</label>
  </div>
);

export default class WaterbodyInfo extends React.Component {
  static defaultProps = {
    waterbody: undefined,
  };

  render() {
    const { waterbody, measurementDate } = this.props;

    if (!waterbody) {
      return <Loading />;
    }

    const nMeasurements = waterbody.measurements.length;
    const measurementInfo = measurementDate
      ? waterbody.measurements.find(m => m.date.isSame(measurementDate))
      : undefined;
    return (
      <div>
        <Info
          key={0}
          value={`${waterbody.properties.name} (${waterbody.properties.country})`}
          label="water body"
        />
        {measurementInfo && [
          <Info key={1} value={measurementInfo.date.format('YYYY-MM-DD')} label="observation date" />,
          <Info key={2} value={`${Math.round(measurementInfo.level * 100)}%`} label="surface area" />,
        ]}
        <Info key={3} value={nMeasurements} label="total observations" />
      </div>
    );
  }
}
