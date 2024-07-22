import "./App.css";
import { MapProvider } from "./contexts/mapcontexts";
import { CreateMap } from "./map/newmap";

function App() {
  return (
    <>
      <MapProvider>
        <CreateMap />
      </MapProvider>
    </>
  );
}

export default App;
