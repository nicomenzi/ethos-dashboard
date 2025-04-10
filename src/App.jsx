import EthosDashboard from './components/EthosDashboard';
import AnalyticsWrapper from './components/AnalyticsWrapper';

function App() {
  return (
    <AnalyticsWrapper>
      <div className="App">
        <EthosDashboard />
      </div>
    </AnalyticsWrapper>
  );
}

export default App;