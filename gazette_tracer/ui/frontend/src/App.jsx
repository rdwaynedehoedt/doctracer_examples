import React, { useEffect, useState } from "react";
import Neo4j from "neo4j-driver";
import TidyTree from "./components/TidyTree";
import EventSlider from "./components/EventSlider";
import GazettePreview from "./components/gazette/GazettePreview";
import PDFViewer from "./components/common/PDFViewer";
import { ErrorBoundary } from "react-error-boundary";
import "./App.css";

// Neo4j connection settings
const uri = import.meta.env.VITE_NEO4J_ORGCHART_DB_URI;
const user = import.meta.env.VITE_NEO4J_ORGCHART_USERNAME;
const password = import.meta.env.VITE_NEO4J_ORGCHART_PASSWORD;

// Validate Neo4j connection settings
if (!uri || !user || !password) {
  throw new Error(
    "Missing Neo4j connection settings. Please ensure VITE_NEO4J_ORGCHART_DB_URI, " +
    "VITE_NEO4J_ORGCHART_USERNAME, and VITE_NEO4J_ORGCHART_PASSWORD environment variables are set."
  );
}

const driver = Neo4j.driver(uri, Neo4j.auth.basic(user, password));

// Fetch gazette dates from a file
const fetchGazetteDates = async () => {
  try {
    const response = await fetch("/gazette_dates.txt");
    const data = await response.text();
    return data.split("\n").map((date) => date.trim()).filter((date) => date !== "");
  } catch (error) {
    console.error("Error fetching dates:", error);
    return [];
  }
};

// Fetch parent and child gazettes from Neo4j
const fetchGazetteData = async (dates) => {
  const session = driver.session();
  const allData = {};

  try {
    for (const selectedDate of dates) {
      if (allData[selectedDate]) continue;

      const result = await session.run(
        `MATCH (c:Gazette)-[r:AMENDS]->(p:Gazette)
        WHERE p.date = $date
        RETURN p, COLLECT(c) AS children`,
        { date: selectedDate }
      );

      if (result.records.length === 0) {
        console.warn(`No data found for date: ${selectedDate}`);
        continue;
      }

      const parentGazette = result.records[0].get("p").properties;
      const childGazettes = result.records[0].get("children");

      const graph = {
        name: parentGazette.name,
        date: parentGazette.date,
        description: parentGazette.description,
        gazette_id: parentGazette.gazette_id,
        url: parentGazette.url,
        children: childGazettes.map(child => ({
          name: child.properties.name,
          date: child.properties.date,
          description: child.properties.description,
          gazette_id: child.properties.gazette_id,
          url: child.properties.url
        }))
      };

      allData[selectedDate] = graph;
    }
    return allData;
  } catch (error) {
    console.error("Error fetching data:", error);
    return {};
  } finally {
    await session.close();
  }
};

const App = () => {
  const [treeData, setTreeData] = useState(null);
  const [selectedGazette, setSelectedGazette] = useState(null);
  const [isTreeDataLoading, setIsTreeDataLoading] = useState(true);
  const [gazetteDates, setGazetteDates] = useState([]);
  const [allData, setAllData] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      const dates = await fetchGazetteDates();
      setGazetteDates(dates);

      if (dates.length > 0) {
        const initialDate = dates.includes('2022-July-22') ? '2022-July-22' : dates[dates.length - 1];
        const initialData = await fetchGazetteData([initialDate]);
        setAllData(initialData);
        setTreeData(initialData[initialDate]);
        setIsTreeDataLoading(false);
      }
    };
    initializeApp();
  }, []);

  const handleDateChange = async (date) => {
    setIsTreeDataLoading(true);
    if (!allData[date]) {
      const newData = await fetchGazetteData([date]);
      setAllData((prevData) => ({ ...prevData, [date]: newData[date] }));
      setTreeData(newData[date]);
    } else {
      setTreeData(allData[date]);
    }
    setIsTreeDataLoading(false);
  };

  const handleNodeSelect = (nodeData) => {
    setSelectedGazette(nodeData);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setTimeout(() => setSelectedGazette(null), 300);
  };

  const handleOpenPdf = (url) => {
    setPdfUrl(url);
    setShowPdfViewer(true);
  };

  const handleClosePdf = () => {
    setShowPdfViewer(false);
    setTimeout(() => setPdfUrl(null), 300);
  };

  const timelineData = gazetteDates.map((date) => ({ date, event: `Gazettes on ${date}` }));

  return (
    <ErrorBoundary>
      <div className="app-container">
        <header className="app-header">
          <h2>Gazette Amendments</h2>
        </header>
        <div className="timeline-container">
          {gazetteDates.length > 0 && <EventSlider data={timelineData} onSelectDate={handleDateChange} />}
        </div>
        <div className="main-content">
          <div className={`tree-container ${showPreview ? 'with-preview' : ''}`}>
            {isTreeDataLoading ? (
              <div className="loading">Loading...</div>
            ) : (
              <TidyTree 
                data={treeData} 
                onNodeSelect={handleNodeSelect}
              />
            )}
            <div className={`preview-section ${showPreview ? 'visible' : ''}`}>
              <button className="close-preview" onClick={handleClosePreview}>×</button>
              <GazettePreview 
                gazette={selectedGazette} 
                onViewPdf={handleOpenPdf}
              />
            </div>
          </div>
        </div>
        
        {/* PDF Viewer as a page-level component */}
        <PDFViewer 
          url={pdfUrl} 
          isOpen={showPdfViewer} 
          onClose={handleClosePdf}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;
