import React from 'react';
import { Provider} from 'react-redux';
import { store } from './redux/store';
import { ThemeWrapper } from './screens/ThemeWrapper';

export default function App() {
  return (
    <>
      <Provider store={store}>
        <ThemeWrapper/>
      </Provider>
    </>
  );
}