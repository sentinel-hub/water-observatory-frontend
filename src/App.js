import React from 'react';
import axios from 'axios';
import moment from 'moment';
import { SizeMe } from 'react-sizeme';
import { Switch, Route } from 'react-router';
import { BrowserRouter } from 'react-router-dom';

/** Components */
import WorldMap from './WorldMap';
import WaterbodyMap from './WaterbodyMap';
import WaterbodyInfo from './WaterbodyInfo';
import SearchBox from './SearchBox';
import Chart from './Chart';
import Header from './Header';
import Error404 from './Error404';

import './styles/App.scss';

class App extends React.Component {
  DEFAULT_WATERBODY_ID = 2307;

  state = {
    width: window.innerWidth,
    waterbodies: [],
    searchString: '',
    waterbody: undefined, // used for centered map
    measurementOutline: undefined,
    measurementDate: undefined,
  };

  componentDidMount() {
    window.addEventListener('resize', this.handleWindowSizeChange);
    this.fetchWaterbodies();
    this.initWaterbody();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleWindowSizeChange);
  }

  componentDidUpdate(prevProps) {
    const { id, date } = this.props.match.params;

    if (this.props.history.action === 'POP') {
      if (prevProps.match.params.id !== id) {
        this.initWaterbody();
      } else if (date && prevProps.match.params.date !== date) {
        this.setMeasurementDate(id, moment(date));
      }
    }
  }

  initWaterbody = () => {
    /*  
     * Get id from url pathname param and fetch, if error, fetch default
     */
    const { id } = this.props.match.params;
    if (id) {
      this.fetchWaterbody(id).catch(err => {
        if (err.response.status >= 400 && err.response.status <= 499) {
          console.log(`An error occurred, while fetching waterbody #${id}.`);
          this.fetchWaterbody(this.DEFAULT_WATERBODY_ID);
        }
      });
    } else {
      this.fetchWaterbody(this.DEFAULT_WATERBODY_ID);
    }
  };

  handleWindowSizeChange = () => {
    this.setState({ width: window.innerWidth });
  };

  onWaterbodySelected = (id, searchString = '') => {
    this.setState({ searchString });
    this.fetchWaterbody(id);
  };

  onSearchStringChange = searchString => {
    this.setState({ searchString });
  };

  setMeasurementDate = (waterbodyId, measurementDate) => {
    this.fetchMeasurementOutline(waterbodyId, measurementDate);
    this.setState({ measurementDate });

    let pathname = `/${waterbodyId}/${measurementDate.format('YYYY-MM-DD')}`;
    if (this.props.location.pathname !== pathname) {
      this.props.history.push(pathname);
    }
  };

  fetchWaterbodies = () => {
    axios
      .get(`${process.env.REACT_APP_BACKEND_ROOT_URI}api/waterbodies/`)
      .then(res => {
        // Sort on fetch resolve
        res.data.sort((a, b) => {
          // some waterbodies' names start with '????' - let's put them in the end:
          const labelA = a.name.toLowerCase().replace('?', 'zzz'); // handle this on backend
          const labelB = b.name.toLowerCase().replace('?', 'zzz');
          return labelA < labelB ? -1 : labelA > labelB ? 1 : 0;
        });

        this.setState({
          waterbodies: res.data,
        });
      })
      .catch(e => console.error(e));
  };

  onlyValidMeasurements(measurements, maxLevelTotal) {
    const validMeasurements = measurements.filter(
      m => m.cc <= 0.02, // && m.level <= maxLevelTotal && m.level <= m.max_level && m.level >= m.min_level,
    );
    return validMeasurements;
  }

  fetchWaterbody = waterbodyId => {
    this.setState({
      loading: true,
    });
    return axios
      .get(`${process.env.REACT_APP_BACKEND_ROOT_URI}api/waterbodies/${waterbodyId}/`)
      .then(res => {
        const validMeasurements = this.onlyValidMeasurements(
          res.data.measurements,
          res.data.max_level_total,
        ).map(m => ({
          ...m,
          date: moment(m.date), // internal representation of dates is always moment.js object
        }));
        const waterbody = {
          ...res.data,
          measurements: validMeasurements,
        };

        const measurementDate =
          this.props.match.params.date &&
          validMeasurements.some(item => moment(item.date).isSame(moment(this.props.match.params.date)))
            ? moment(this.props.match.params.date)
            : validMeasurements[validMeasurements.length - 1].date; // or last measurement date

        this.setState({
          waterbody: waterbody,
          measurementDate: measurementDate,
          loading: false,
        });
        this.setMeasurementDate(waterbodyId, measurementDate);
      })
      .catch(e => {
        console.error('fetchWaterbody: ', e);
        throw e;
      });
  };

  fetchMeasurementOutline = (waterbodyId, date) => {
    axios
      .get(
        `${process.env.REACT_APP_BACKEND_ROOT_URI}api/waterbodies/${waterbodyId}/measurements/${date.format(
          'YYYY-MM-DD',
        )}/`,
      )
      .then(res => {
        this.setState({
          measurementOutline: res.data,
        });
      })
      .catch(e => console.error(e));
  };

  render() {
    const {
      width,
      waterbodies,
      waterbody,
      measurementOutline,
      measurementDate,
      searchString,
      loading,
    } = this.state;

    return (
      <div id="app">
        <Header waterbody={waterbody} loading={loading} />
        <SizeMe monitorHeight>
          {({ size }) => (
            <div id="content">
              <div className="panel info">
                <SearchBox
                  waterbodies={waterbodies}
                  searchString={searchString} // used for list filtering
                  onWaterbodySelected={this.onWaterbodySelected} // action to fetch
                  onSearchStringChange={this.onSearchStringChange} // onChange for searchString
                />
                <WaterbodyInfo waterbody={waterbody} measurementDate={measurementDate} />
              </div>
              <div className="panel waterbody">
                <WaterbodyMap
                  size={size}
                  waterbody={waterbody}
                  measurementOutline={measurementOutline}
                  measurementDate={measurementDate}
                  onDateSelect={this.setMeasurementDate}
                />
              </div>
              <div className="panel map">
                <WorldMap
                  size={size}
                  waterbodies={waterbodies}
                  onWaterbodySelected={this.onWaterbodySelected}
                  waterbody={waterbody}
                />
              </div>
            </div>
          )}
        </SizeMe>

        <div className="panel chart">
          <Chart
            waterbody={waterbody}
            contentWidth={width}
            onDateSelect={this.setMeasurementDate}
            selectedMeasurementDate={measurementDate}
          />
        </div>

        <div id="footer">
          Powered by&nbsp;
          <a href="https://www.sentinel-hub.com/">Sentinel Hub</a>
        </div>
      </div>
    );
  }
}

const AppRoutes = () => (
  <BrowserRouter basename={process.env.REACT_APP_BASENAME}>
    <Switch>
      <Route path="/:id(\d+)?/:date(\d{4}-\d{2}-\d{2})?" exact component={App} />
      <Route component={Error404} />
    </Switch>
  </BrowserRouter>
);

export default AppRoutes;
