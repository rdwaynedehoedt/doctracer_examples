import React, { useEffect, useState } from "react";
import Neo4j from "neo4j-driver";
import TidyTree from "./components/TidyTree"; // Component to visualize the tree
import EventSlider from "./components/EventSlider";
import { ErrorBoundary } from "react-error-boundary";

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
      if (allData[selectedDate]) continue; // Skip if already fetched

      // Query to fetch parent gazettes and their child amendments
      const result = await session.run(
        `MATCH (c:Gazette)-[r:AMENDS]->(p:Gazette)
        WHERE p.date = $date
        RETURN p, COLLECT(c) AS children`,
        { date: selectedDate } // Dynamically pass selectedDate
      );

      if (result.records.length === 0) {
        console.warn(`No data found for date: ${selectedDate}`);
        continue;
      }

      // Extract the first parent gazette from the result
      const parentGazette = result.records[0].get("p").properties;
      const childGazettes = result.records[0].get("children");

      // Set the parent gazette name as the root
      const graph = {
        name: parentGazette.name,
        children: childGazettes.map(child => ({ name: child.properties.name }))
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
  const [isTreeDataLoading, setIsTreeDataLoading] = useState(true);
  const [gazetteDates, setGazetteDates] = useState([]);
  const [allData, setAllData] = useState({});

  useEffect(() => {
    const initializeApp = async () => {
      const dates = await fetchGazetteDates();
      setGazetteDates(dates);

      if (dates.length > 0) {
        const latestDate = dates[dates.length - 1];
        const initialData = await fetchGazetteData([latestDate]);
        setAllData(initialData);
        setTreeData(initialData[latestDate]);
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

  const timelineData = gazetteDates.map((date) => ({ date, event: `Gazettes on ${date}` }));

  return (
    <ErrorBoundary>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#1e1e1e", color: "white" }}>
        <header style={{ height: "50px", backgroundColor: "#1e1e1e", padding: "10px 20px", color: "white" }}>
          <h2>Gazette Amendments</h2>
        </header>
        <div style={{ height: "120px", backgroundColor: "#1e1e1e", padding: "20px", display: "flex", alignItems: "center" }}>
          {gazetteDates.length > 0 && <EventSlider data={timelineData} onSelectDate={handleDateChange} />}
        </div>
        <div style={{ flex: 1, padding: "20px", overflow: "auto", backgroundColor: "#1e1e1e", color: "white" }}>
          {isTreeDataLoading ? <p>Loading...</p> : <TidyTree data={treeData} />}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
