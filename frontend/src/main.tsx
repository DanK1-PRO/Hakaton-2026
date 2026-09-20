import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { store } from './store';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ConfigProvider
          locale={ruRU}
          theme={{
            token: {
              colorPrimary: '#167786',
              colorSuccess: '#338453',
              colorWarning: '#ac731c',
              borderRadius: 4,
              fontFamily: 'Segoe UI, Arial, sans-serif',
              fontSize: 14,
            },
            components: {
              Table: { headerBg: '#edf1f2', cellPaddingBlock: 11 },
              Button: { controlHeight: 36 },
            },
          }}
        >
          <AntApp message={{ maxCount: 1, duration: 1.5 }}>
            <App />
          </AntApp>
        </ConfigProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
