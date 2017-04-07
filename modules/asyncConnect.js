import { connect } from 'react-redux';
import { fromJS } from 'immutable';

export const LOAD = 'reduxAsyncConnect/LOAD';
export const LOAD_SUCCESS = 'reduxAsyncConnect/LOAD_SUCCESS';
export const LOAD_FAIL = 'reduxAsyncConnect/LOAD_FAIL';
export const CLEAR = 'reduxAsyncConnect/CLEAR';
export const BEGIN_GLOBAL_LOAD = 'reduxAsyncConnect/BEGIN_GLOBAL_LOAD';
export const END_GLOBAL_LOAD = 'reduxAsyncConnect/END_GLOBAL_LOAD';

const initialState = fromJS({
  loaded: false,
});

export function reducer(state = initialState, action = {}) {
  let temp;

  switch (action.type) {
    case BEGIN_GLOBAL_LOAD:
      return state.set('loaded', false);
    case END_GLOBAL_LOAD:
      return state.set('loaded', true);
    case LOAD:
      return state.mergeIn(['loadState', action.key], { loading: true, loaded: false });
    case LOAD_SUCCESS:
      temp = state.mergeIn(['loadState', action.key], { loading: false, loaded: true, error: null });
      return temp.set(action.key, action.data);
    case LOAD_FAIL:
      temp = state.mergeIn(['loadState', action.key], { loading: false, loaded: false, error: action.error });
      return temp.set(action.key, null);
    case CLEAR:
      temp = state.mergeIn(['loadState', action.key], { loading: false, loaded: false, error: null });
      return temp.set(action.key, null);
    default:
      return state;
  }
}

export const clearKey = (key) => ({
  type: CLEAR,
  key
});

export const beginGlobalLoad = () => ({
  type: BEGIN_GLOBAL_LOAD,
});

export const endGlobalLoad = () => ({
  type: END_GLOBAL_LOAD,
});

const load = (key) => ({
  type: LOAD,
  key
});

export const loadSuccess = (key, data) => ({
  type: LOAD_SUCCESS,
  key,
  data
});

const loadFail = (key, error) => ({
  type: LOAD_FAIL,
  key,
  error
});

function wrapWithDispatch(asyncItems) {
  return asyncItems.map(item =>
    item.key ? {...item, promise: (options) => {
      const {dispatch} = options.store;
      const promiseOrResult = item.promise(options);
      if (promiseOrResult !== undefined) {
        if (promiseOrResult.then instanceof Function) {
          dispatch(load(item.key));
          promiseOrResult.then(data => dispatch(loadSuccess(item.key, data)))
                         .catch(err => dispatch(loadFail(item.key, err)));
        } else {
          dispatch(loadSuccess(item.key, promiseOrResult));
        }

      }
      return promiseOrResult;
    }} : item
  );
}

export function asyncConnect(asyncItems) {
  return Component => {
    Component.reduxAsyncConnect = wrapWithDispatch(asyncItems);

    const finalMapStateToProps = state => {
      return asyncItems.reduce((result, item) =>
        item.key ? {...result, [item.key]: state.getIn(['reduxAsyncConnect', item.key])} : result,
        {}
      );
    };

    return connect(finalMapStateToProps)(Component);
  };
}
