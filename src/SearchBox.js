import React from 'react';
import Autocomplete from 'react-autocomplete';
import './styles/SearchBox.scss';
import debounce from 'lodash/debounce';

export default class SearchBox extends React.PureComponent {
  static defaultProps = {
    waterbodies: [],
  };

  state = {
    value: '',
  };

  // filter on type (debounced for 100ms)
  debouncedOnChange = debounce(this.props.onSearchStringChange, 100);

  onChangeHandle = e => {
    this.setState({
      value: e.target.value,
    });
    e.persist(); // We have to do e.persist so we can pass the event around
    this.debouncedOnChange(e.target.value); // call the debounced function
  };

  render() {
    const { searchString, waterbodies } = this.props;

    const waterbodiesOptions = waterbodies
      .map(wb => ({ value: wb.id, label: `${wb.name} (${wb.country})` }))
      .filter(
        (wb, index) =>
          // show if searchString is a substring of wb.label
          wb.label.toLowerCase().indexOf(searchString.toLowerCase()) !== -1 &&
          // the list will be empty, if the searchString is empty
          searchString.length >= 1,
      );

    return (
      <div className="search-box">
        <label>Search water bodies</label>
        <Autocomplete
          getItemValue={item => item.label}
          items={waterbodiesOptions}
          renderItem={(item, isHighlighted) => (
            <div
              className="search-item"
              key={item.value}
              style={{ backgroundColor: isHighlighted ? '#26accc' : '#317EA2' }}
            >
              {item.label}
            </div>
          )}
          inputProps={{ placeholder: 'Type name or country' }}
          value={this.state.value}
          onChange={e => this.onChangeHandle(e)}
          onSelect={(val, item) => {
            // item value = wo.id
            this.setState({ value: val });
            this.props.onWaterbodySelected(item.value);
          }}
          wrapperStyle={{ position: 'relative', width: '100%' }}
          menuStyle={{
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
            background: '#06304a',
            color: 'white',
            zIndex: 9000,
            fontSize: '90%',
            position: 'absolute',
            overflow: 'auto',
            maxHeight: '300px',
            top: 39,
            left: 0,
            width: '100%',
          }}
        />
      </div>
    );
  }
}
