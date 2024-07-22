import React, { createContext, useEffect, useState } from "react";

const MapContext = createContext(undefined);

const MapProvider = ({ children }) => {
  const contextValue = {};

  return (
    <MapContext.Provider value={contextValue}>{children}</MapContext.Provider>
  );
};

export { MapProvider, MapContext };
