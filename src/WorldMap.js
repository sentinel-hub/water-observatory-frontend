import React from 'react';
import { Layer, Feature, Popup, GeoJSONLayer } from 'react-mapbox-gl';

import Loading from './Loading';
import Map from './Map';

export default class WorldMap extends React.PureComponent {
  static defaultProps = {
    defaultLat: -20.0,
    defaultLng: 23.0,
    defaultZoom: 0,
    style: 'mapbox://styles/mapbox/light-v9',
    waterbodies: [],
    waterbody: undefined,
    onWaterbodySelected: waterbodyId => {},
  };
  UNSELECTED_CIRCLE_PAINT = {
    'circle-radius': 5,
    'circle-color': '#26accc',
    'circle-opacity': 1.0,
  };
  SELECTED_CIRCLE_PAINT = {
    'circle-radius': 7,
    'circle-color': '#e8c26e',
    'circle-opacity': 1.0,
  };
  HOVER_CIRLCE_PAINT = {
    'circle-radius': 6,
    'circle-color': '#e8c26e',
    'circle-opacity': 1.0,
  };
  MAP_CONTAINER_STYLE = {
    height: '100%',
    width: '100%',
  };
  CLICK_DISTANCE = 10;
  CLUSTER_MAX_ZOOM = 3;

  state = {
    centerLngLat: [this.props.defaultLat, this.props.defaultLng],
    zoom: [this.props.defaultZoom],
    wbGeojson: undefined,
    waterbodyId: undefined,
    hoveredCoords: null,
    hoveredName: '',
  };

  componentDidUpdate(prevProps) {
    if (prevProps.waterbody !== this.props.waterbody) {
      // whenever the selected waterbody changes, center to it:
      this.centerOnWaterbody();
    }
    if (this.map && prevProps.size.height !== this.props.size.height) {
      this.map.resize();
    }
    if (prevProps.waterbodies !== this.props.waterbodies) {
      const wbGeojson = {
        type: 'FeatureCollection',
        features: this.props.waterbodies.map(wb => {
          return {
            type: 'Feature',
            properties: {
              id: wb.id,
              name: wb.name,
            },
            geometry: {
              type: 'Point',
              coordinates: [wb.long, wb.lat],
            },
          };
        }),
      };
      this.setState({ wbGeojson });
    }
  }

  onMouseEnter = (wbCoords, feature) => {
    this.map.getCanvas().style.cursor = 'pointer';
    this.setState({ hoveredCoords: wbCoords, hoveredName: feature.properties.name });
  };

  onMouseLeave = () => {
    this.map.getCanvas().style.cursor = '';
    this.setState({ hoveredCoords: null, hoveredName: '' });
  };

  onMapViewportChange = map => {
    const center = map.getCenter();
    this.setState({
      centerLngLat: [center.lng, center.lat],
      zoom: [map.getZoom()],
    });
  };

  onMapLoad = map => {
    // MapBox map doesn't know when the size of its container might change. As a consequence,
    // when first waterbody is loaded, the map doesn't stretch to fill the container. This solves
    this.map = map; // needed in componentDidUpdate

    if (this.props.size.height !== map._container.clientHeight) {
      map.resize();
    }

    map.on('click', 'waterbodies-layer', e => {
      this.props.onWaterbodySelected(e.features[0].properties.id, e.features[0].properties.name);
    });

    map.on('mouseenter', 'cluster_layer', e => {
      this.map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'cluster_layer', e => {
      this.map.getCanvas().style.cursor = '';
    });

    map.on('mousemove', 'waterbodies-layer', e => {
      const wbCoords = e.features[0].geometry.coordinates;
      this.onMouseEnter(wbCoords, e.features[0]);
    });

    map.on('mouseleave', 'waterbodies-layer', () => {
      this.onMouseLeave();
    });

    map.on('click', 'cluster_layer', e => {
      this.onClusterClick(e);
    });

    this.map = map;
    this.centerOnWaterbody();
  };

  centerOnWaterbody = () => {
    if (!this.map || !this.props.waterbody) {
      return;
    }
    const { waterbody } = this.props;
    this.setState({
      centerLngLat: [waterbody.properties.long, waterbody.properties.lat],
    });
  };

  onClusterClick = evt => {
    this.setState({
      centerLngLat: [evt.lngLat.lng, evt.lngLat.lat],
      zoom: [this.CLUSTER_MAX_ZOOM + 1],
    });
  };

  render() {
    const { style, waterbody: selectedWaterbody } = this.props;
    const { centerLngLat, zoom, hoveredCoords, hoveredName } = this.state;

    if (!selectedWaterbody) {
      return <Loading />;
    }

    return (
      <Map
        center={centerLngLat}
        zoom={zoom}
        style={style}
        containerStyle={this.MAP_CONTAINER_STYLE}
        onZoomEnd={this.onMapViewportChange}
        onMoveEnd={this.onMapViewportChange}
        onStyleLoad={this.onMapLoad}
      >
        <GeoJSONLayer
          id="wb_source_id"
          data={this.state.wbGeojson}
          sourceOptions={{
            cluster: true,
            clusterMaxZoom: this.CLUSTER_MAX_ZOOM,
            clusterRadius: 60,
          }}
        />
        {// Show tooltip if hovering over a point
        hoveredCoords && <Popup coordinates={hoveredCoords}>{hoveredName}</Popup>}
        <Layer
          id="waterbodies-layer"
          sourceId="wb_source_id"
          type="circle"
          layerOptions={{}}
          filter={['!', ['has', 'point_count']]}
          paint={this.UNSELECTED_CIRCLE_PAINT}
        />

        <Layer
          id="cluster_layer"
          sourceId="wb_source_id"
          layerOptions={{}}
          filter={['has', 'point_count']}
          paint={{
            'circle-color': {
              property: 'point_count',
              type: 'interval',
              stops: [[0, '#a8d4dd'], [100, '#589dad'], [400, '#1a829b']],
            },
            'circle-radius': {
              property: 'point_count',
              type: 'interval',
              stops: [[0, 20], [100, 30], [400, 40]],
            },
          }}
          type="circle"
        />
        <Layer
          id="cluster_count"
          sourceId="wb_source_id"
          filter={['has', 'point_count']}
          layout={{
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12,
          }}
          type="symbol"
        />
        <Layer
          id="hover-waterbody-layer"
          type="circle"
          paint={this.HOVER_CIRLCE_PAINT}
          layout={{ visibility: hoveredCoords ? 'visible' : 'none' }}
        >
          <Feature coordinates={hoveredCoords || [0, 0]} />
        </Layer>

        {selectedWaterbody && (
          <Layer type="circle" paint={this.SELECTED_CIRCLE_PAINT} id="selected-waterbody-layer">
            <Feature
              key={selectedWaterbody.properties.id}
              coordinates={[selectedWaterbody.properties.long, selectedWaterbody.properties.lat]}
              properties={{ _id: selectedWaterbody.properties.id }}
            />
          </Layer>
        )}
      </Map>
    );
  }
}
