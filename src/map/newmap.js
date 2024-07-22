import React, { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../style/style.css";
import "leaflet.wms";
import proj4 from "proj4";
import { BiChevronsLeft } from "react-icons/bi";
import { BiChevronsRight } from "react-icons/bi";

proj4.defs(
  "EPSG:3857",
  "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs"
);
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");

export const CreateMap = () => {
  const [openContent, setOpenContent] = useState(false);
  const [content, setContent] = useState();
  const convertCoordinates = (coordinates3857) => {
    return coordinates3857?.map((coord) => {
      const lonlat = proj4("EPSG:3857", "EPSG:4326", coord);
      return [lonlat[1], lonlat[0]];
    });
  };

  useEffect(() => {
    const map = L.map("map", {
      maxZoom: 20,
      minZoom: -Infinity,
    });
    map.setView([21.26738, 106.214576], 16);

    // Thêm tile layer từ WMS
    const baseLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 22,
      }
    ).addTo(map);

    // Thêm lớp WMS mới
    const wmsLayer = L.tileLayer
      .wms("http://localhost:8888/geoserver/BIGC/wms", {
        layers: "BIGC:datamoi",
        format: "image/png",
        transparent: true,
        attribution: "BIGC GeoServer",
        maxZoom: 22,
      })
      .addTo(map);

    const bothLayers = L.layerGroup([baseLayer, wmsLayer]);
    var polygon;
    map.on("click", function (e) {
      if (typeof polygon !== "undefined") {
        map.removeLayer(polygon);
      }
      // Get click coordinates
      const latlng = e.latlng;

      // var marker = new L.Marker(latlng).on("click").addTo(map);
      // var popup = L.popup()
      //   .setLatLng(latlng)
      //   .setContent(`<p>${latlng}</p>`)
      //   .openOn(map);

      setOpenContent(true);

      // Convert latlng to WMS CRS (EPSG:3857)
      const point = map.latLngToContainerPoint(latlng, map.getZoom());
      const size = map.getSize();

      const bbox = map.getBounds();

      const southWest = proj4("EPSG:4326", "EPSG:3857", [
        bbox.getSouthWest().lng,
        bbox.getSouthWest().lat,
      ]);
      const northEast = proj4("EPSG:4326", "EPSG:3857", [
        bbox.getNorthEast().lng,
        bbox.getNorthEast().lat,
      ]);

      const bboxurl = `${southWest},${northEast}`.replace(/,/g, "%2C");

      const url = `
        http://localhost:8888/geoserver/BIGC/wms?
        SERVICE=WMS&
        VERSION=1.1.1&
        REQUEST=GetFeatureInfo&
        FORMAT=image%2Fpng&
        TRANSPARENT=true&
        QUERY_LAYERS=BIGC%3Adatamoi&
        STYLES&
        LAYERS=BIGC%3Adatamoi&
        exceptions=application%2Fvnd.ogc.se_inimage&
        INFO_FORMAT=application/json&
        FEATURE_COUNT=50&
        X=${point.x}&
        Y=${point.y}&
        SRS=EPSG%3A3857&
        WIDTH=${size.x}&
        HEIGHT=${size.y}&
        BBOX=${bboxurl}
      `.replace(/\s+/g, "");

      fetch(url, {
        method: "GET",
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then(function (data) {
          if (data.features.length === 0) {
            setOpenContent(false);
          } else {
            setContent(data.features[0].properties);
            let lnglonArray = [];
            data.features[0].geometry.coordinates?.forEach(function (element) {
              lnglonArray.push(element[0]);
            });
            const coordinates4326 = convertCoordinates(lnglonArray[0]);

            polygon = L.polygon([coordinates4326]).addTo(map);
          }
        })
        .catch(function (error) {
          console.error("Fetch error:", error);
        });
    });

    const baseMaps = {
      "Base Map": baseLayer,
      "WMS Layer": wmsLayer,
      "Both Layers": bothLayers,
    };
    L.control.layers(baseMaps).addTo(map);

    return () => map.remove();
  }, []);

  return (
    <>
      <div
        id="list-search"
        style={{
          transform: openContent ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <p className="header-info">Thông Tin</p>

        <p className="header-error">
          Lưu ý: Kết quả tra cứu chỉ có giá trị tham khảo.
        </p>
        <p className="text-center text-primary border-bottom fs-6">
          Thông tin thửa đất
        </p>
        {content ? (
          <div id="list-content">
            <table className="table">
              <tbody className="table-info">
                <tr>
                  <td>Tên</td>
                  <td>{content?.layer}</td>
                </tr>
                <tr>
                  <td>Số thửa</td>
                  <td>{content?.objectid}</td>
                </tr>
                <tr>
                  <td>Diện tích</td>
                  <td>{content?.shape_area.toFixed(2)} m²</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div style={{ height: "80%" }}>
              <img
                src="http://localhost:8888/geoserver/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&STRICT=false&style=BIGC:style_bigc"
                alt=""
                height={"100%"}
              />
            </div>
          </>
        )}

        <div
          id="close-content"
          onClick={() => {
            setOpenContent(!openContent);
            setContent();
          }}
        >
          {openContent ? <BiChevronsLeft /> : <BiChevronsRight />}
        </div>
      </div>

      <div className="main__map">
        <div id="map" />
      </div>
    </>
  );
};
