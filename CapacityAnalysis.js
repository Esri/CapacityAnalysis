/*
  Copyright 2020 Esri

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.​
*/
/**
 *
 * CapacityAnalysis
 *  - manage the results from a run of a capacity model
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  4/3/2020 - 0.0.1 -
 * Modified:
 *
 */
define([
  "./CapacityAnalysisParameters",
  "./CapacityAnalysisResults",
  "esri/request",
  "esri/core/Accessor",
  "esri/core/promiseUtils",
  "esri/core/watchUtils",
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/renderers/smartMapping/statistics/summaryStatistics",
  "esri/widgets/Home",
  "esri/widgets/Legend"
], function (CapacityAnalysisParameters, CapacityAnalysisResults,
  esriRequest, Accessor, promiseUtils, watchUtils,
  EsriMap, MapView, FeatureLayer,
  summaryStatistics, Home, Legend) {

  /**
   * MANAGE THE RESULTS FROM A RUN OF A CAPACITY MODEL
   *
   * @type {Function}
   */
  const CapacityAnalysis = Accessor.createSubclass({
    declaredClass: "CapacityAnalysis",

    properties: {
      container: {
        type: HTMLDivElement | String,
        set: function (container) {
          // CONTAINER //
          this._set('container', container instanceof HTMLDivElement ? container : document.getElementById(container));
          // INITIALIZE UI //
          this._initializeUI();
        }
      },
      id: {
        type: String
      },
      panel: {
        type: HTMLDivElement
      },
      infoPanel: {
        type: HTMLDivElement
      },
      layerTitleNode: {
        type: HTMLDivElement
      },
      indicatorNode: {
        type: HTMLDivElement
      },
      indicatorSVG: {
        type: SVGElement
      },
      bedsTotalNode: {
        type: HTMLDivElement
      },
      percentCapacityNode: {
        type: HTMLDivElement
      },
      viewPanel: {
        type: HTMLDivElement
      },
      loaderNode: {
        type: HTMLDivElement
      },
      map: {
        type: EsriMap
      },
      viewProperties: {
        type: Object
      },
      view: {
        type: MapView
      },
      layer: {
        type: FeatureLayer
      },
      title: {
        type: String
      },
      description: {
        type: String
      },
      layerView: {
        type: Object
      },
      firstDay: {
        type: Date
      },
      analysisParameters: {
        type: CapacityAnalysisParameters
      },
      variables: {
        type: Array.of(String),
        aliasOf: 'analysisParameters.variables'
      },
      sourceFields: {
        type: Object,
        aliasOf: 'analysisParameters.sourceFields'
      },
      variableFields: {
        type: Object,
        aliasOf: 'analysisParameters.variableFields'
      },
      separator: {
        type: String,
        aliasOf: 'analysisParameters.separator'
      },
      rendererColors: {
        type: Array.of(String),
        aliasOf: 'analysisParameters.rendererColors'
      },
      colorDataStops: {
        type: Array.of(Number),
        aliasOf: 'analysisParameters.colorDataStops'
      },
      dataColor: {
        type: String
      },
      days: {
        type: Number,
        set: function (days) {
          this._set('days', days);
          this.layerAnalysisResults = new CapacityAnalysisResults({
            title: this.title,
            days
          });
          this.featureAnalysisResults = [];
        }
      },
      layerAnalysisResults: {
        type: CapacityAnalysisResults
      },
      featureAnalysisResults: {
        type: Array.of(CapacityAnalysisResults)
      },
      overageMax: {
        type: Number
      },
      displayDetailsCallback: {
        type: Function
      }
    },

    /**
     * SET REQUIRED UI ELEMENTS
     *
     * @private
     */
    _initializeUI: function () {

      // LAYER TITLE NODE //
      this.layerTitleNode = this.container.querySelector('.analysis-title-node');

      // STATS NODES //
      this.bedsTotalNode = this.container.querySelector('.analysis-stats-beds-node');
      this.percentCapacityNode = this.container.querySelector('.analysis-stats-capacity-node');

      // VIEW PANEL //
      this.viewPanel = this.container.querySelector('.analysis-view-panel');

      // LOADING NODE //
      this.loaderNode = this.container.querySelector('.loader');

      // INDICATOR //
      this.indicatorNode = this.container.querySelector(".analysis-indicator");

      // INDICATOR SVG //
      this.indicatorSVG = this.indicatorNode.querySelector(".indicator-svg");

      // INITIALIZE INDICATOR UPDATES //
      this._initializeIndicator();

    },

    /**
     * CREATE MAP VIEW
     *
     * @returns {*}
     * @private
     */
    _createMapView: function () {
      return promiseUtils.create((resolve, reject) => {

        watchUtils.whenDefinedOnce(this, 'viewPanel').then(() => {

          // ANALYSIS CONTAINER STYLE BORDER COLOR //
          this.container.style.border = `solid 3px ${this.dataColor}`;

          // MAP VIEW //
          this.mapView = new MapView({
            ...this.viewProperties,
            container: this.viewPanel,
            map: new EsriMap({
              basemap: this.map.basemap,
              layers: [this.layer]
            }),
            viewpoint: this.map.initialViewProperties.viewpoint,
            constraints: {
              snapToZoom: false,
              rotationEnabled: false
            },
            highlightOptions: {
              color: "#343434",
              haloColor: "#343434",
              haloOpacity: 1.0,
              fillOpacity: 0.2
            },
            popup: {
              dockEnabled: true,
              dockOptions: {
                buttonEnabled: false,
                breakpoint: false,
                position: "bottom-left"
              }
            }
          });

          this.mapView.when(() => {

            // HOME //
            const home = new Home({
              view: this.mapView
            });
            this.mapView.ui.add(home, {
              position: "top-left",
              index: 0
            });
            this.resetMapViewExtent = () => {
              home.go();
            };

            // LEGEND //
            //  - WE ONLY DO THIS ONCE //
            if (this.id === 'left') {
              const legend = new Legend({
                container: 'legend-container',
                view: this.mapView,
                style: {
                  type: 'card',
                  layout: 'side-by-side'
                },
                layerInfos: [{
                  layer: this.layer,
                  title: 'Capacity Analysis'
                }]
              });
            }

            // ADD INDICATOR //
            this.mapView.ui.add(this.indicatorNode, "top-right");
            this.indicatorNode.classList.remove('hide');

            // MAKE SURE LAYER IS VISIBLE //
            this.layer.visible = true;

            // WHEN MAPVIEW HAS FINISHED UPDATING //
            watchUtils.whenNotOnce(this.mapView, 'updating').then(() => {
              // REMOVE LOADING //
              this.loaderNode.classList.remove('is-active');
              // RESOLVE //
              resolve();
            });
          }, reject);

        });
      });
    },

    /**
     * LOAD LAYER AND PROCESS ANALYSIS RESULTS
     *
     * @returns {Promise}
     */
    load: function () {
      return promiseUtils.create((resolve, reject) => {
        if (this.container && this.map && this.layer) {

          // LAYER LOAD //
          return this.layer.load().then(() => {
            this.layer.outFields = [...this.analysisParameters.requiredFields];

            // LAYER TITLE //
            this.layerTitleNode.innerHTML = this.title;

            // INITIALIZE ANALYSIS DETAILS //
            this.initializeAnalysisDetails();

            // CREATE MAP VIEW //
            this._createMapView().then(() => {

              // WHEN LAYERVIEW READY //
              this.mapView.whenLayerView(this.layer).then(layerView => {
                // SET LAYERVIEW //
                this.layerView = layerView;
                // FINISHED UPDATING //
                watchUtils.whenNotOnce(this.layerView, 'updating').then(() => {

                  // GET ANALYSIS RESULTS //
                  this._getAnalysisResults().then(resolve).catch(reject);

                });
              }).catch(reject);
            }).catch(reject);
          }).catch(reject);

        } else {
          reject(new Error("Error loading CapacityAnalysis: missing 'container', 'map', or 'layer' parameter."))
        }
      });
    },

    /**
     * DISASSEMBLE AND AGGREGATE COUNTS AND CAPACITY FOR THE ENTIRE LAYER AND FOR EACH LOCATION
     *
     * @returns {Promise}
     * @private
     */
    _getAnalysisResults: function () {
      return promiseUtils.create((resolve, reject) => {

        // NO DATA //
        // TODO: HOW DOES THE CHART DEAL WITH NULL VALUES ???
        const NO_DATA = null; // 0;

        // SPLIT DATA ARRAY //
        const splitDataArray = dataArray => {
          return dataArray.split(this.separator).map(value => {
            //return Math.max(0, parseInt(value));
            const valueInt = parseInt(value);
            return (valueInt > -1) ? valueInt : NO_DATA;
          });
        };

        const dataQuery = this.layerView.createQuery();
        dataQuery.set({
          where: '1=1',
          outFields: this.layerView.availableFields
        });
        this.layerView.queryFeatures(dataQuery).then(dataFS => {

          if (dataFS.features.length) {

            // FIRST FEATURE //
            const firstFeature = dataFS.features[0];
            // NUMBER OF DAYS //
            this.days = firstFeature.attributes[this.sourceFields.DAYS];
            // FIRST DAY //
            this.firstDay = new Date(firstFeature.attributes[this.sourceFields.FIRST_DAY]);

            // FOR EACH FEATURE //
            dataFS.features.forEach(feature => {
              // FEATURE ID //
              const featureId = feature.attributes[this.sourceFields.ID];

              // FEATURE TITLE //
              const featureTitle = feature.attributes[this.sourceFields.NAME];

              // BEDS BASE ATTRIBUTES //
              const HospitalizedCapacity = feature.attributes[this.variableFields.Hospitalized.CAPACITY];
              const ICUCapacity = feature.attributes[this.variableFields.ICU.CAPACITY];
              const VentilatedCapacity = feature.attributes[this.variableFields.Ventilated.CAPACITY];

              // FEATURE DAILY TOTALS //
              const HospitalizedByDay = splitDataArray(feature.attributes[this.variableFields.Hospitalized.COUNTS]);
              const ICUByDay = splitDataArray(feature.attributes[this.variableFields.ICU.COUNTS]);
              const VentilatedByDay = splitDataArray(feature.attributes[this.variableFields.Ventilated.COUNTS]);

              // COUNTS AND CAPACITY FOR FEATURE //
              this.featureAnalysisResults[featureId] = new CapacityAnalysisResults({
                title: featureTitle,
                days: this.days
              });

              // PER FEATURE COUNTS AND CAPACITY //
              this.featureAnalysisResults[featureId].Hospitalized.Counts = HospitalizedByDay;
              this.featureAnalysisResults[featureId].Hospitalized.Capacity = HospitalizedCapacity;
              this.featureAnalysisResults[featureId].ICU.Counts = ICUByDay;
              this.featureAnalysisResults[featureId].ICU.Capacity = ICUCapacity;
              this.featureAnalysisResults[featureId].Ventilated.Counts = VentilatedByDay;
              this.featureAnalysisResults[featureId].Ventilated.Capacity = VentilatedCapacity;

              // LAYER CAPACITY //
              this.layerAnalysisResults.Hospitalized.Capacity += HospitalizedCapacity;
              this.layerAnalysisResults.ICU.Capacity += ICUCapacity;
              this.layerAnalysisResults.Ventilated.Capacity += VentilatedCapacity;

              // SUM LAYER COUNTS //
              for (let day = 0; day < this.days; day++) {

                // DAILY TOTALS //
                const hospitalizedDay = (day < HospitalizedByDay.length) ? HospitalizedByDay[day] : NO_DATA;
                this.layerAnalysisResults.Hospitalized.Counts[day] += hospitalizedDay;

                const icuDay = (day < ICUByDay.length) ? ICUByDay[day] : NO_DATA;
                this.layerAnalysisResults.ICU.Counts[day] += icuDay;

                const ventilatedDay = (day < VentilatedByDay.length) ? VentilatedByDay[day] : NO_DATA;
                this.layerAnalysisResults.Ventilated.Counts[day] += ventilatedDay;

              }
            });

            // SET OVERAGE MAX  //
            this._setOverageMax().then(resolve);

          } else {
            reject(new Error(`Error: could not retrieve any features from this layer: ${this.title}`));
          }
        });
      });
    },

    /**
     * CALC OVERAGE MAX
     *  - USED TO COME UP WITH A GOOD MAX SIZE VALUE FOR THE RENDERERS
     *
     * @returns {Promise}
     */
    _setOverageMax: function () {
      return promiseUtils.create((resolve, reject) => {

        const _getOverageMax = (variableFieldInfos) => {
          return summaryStatistics({
            layer: this.layer,
            view: this.mapView,
            valueExpression: `IIF($feature.${variableFieldInfos.PEAK} - $feature.${variableFieldInfos.CAPACITY} > 0, $feature.${variableFieldInfos.PEAK} - $feature.${variableFieldInfos.CAPACITY}, null)`
          }).then(function (stats) {
            return Math.round(stats.avg + stats.stddev);
          });
        };

        const overageMaxHandles = this.variables.map(variable => {
          return _getOverageMax(this.variableFields[variable]).then(maxOverage => {
            return maxOverage;
          }).catch(error => {
            return -Infinity;
          });
        });
        promiseUtils.eachAlways(overageMaxHandles).then(overageMaxResponses => {
          this.overageMax = overageMaxResponses.reduce((max, overageMaxResponse) => {
            return Math.max(max, overageMaxResponse.value);
          }, -Infinity);
          resolve();
        });
      });
    },

    /**
     * UPDATE COUNT LABELS AND INDICATOR
     *
     * @param count
     * @param capacity
     * @param units
     */
    updateCounts: function ({
      count,
      capacity,
      units
    }) {

      const capacityPercent = Math.round((count / capacity) * 100);
      this.percentCapacityNode.innerHTML = `${Math.abs(capacityPercent).toLocaleString()}% capacity`;
      this.bedsTotalNode.innerHTML = `${Math.abs(count).toLocaleString()} ${units}`;

      this._updateIndicator(capacityPercent);

    },

    /**
     * INDICATOR UPDATES BASED ON CAPACITY
     */
    _initializeIndicator: function () {

      const fillStart = this.indicatorSVG.querySelector(".prop_start");
      const fillStop1 = this.indicatorSVG.querySelector(".prop_v1");
      const fillStop2 = this.indicatorSVG.querySelector(".prop_v2");
      const fillEnd = this.indicatorSVG.querySelector(".prop_end");

      this._updateIndicator = (capacityPercent) => {

        if (capacityPercent < this.colorDataStops[1]) {
          // this.percentCapacityNode.style.color = this.rendererColors[0];
          fillStop1.setAttribute("offset", capacityPercent + "%");
          fillStop2.setAttribute("offset", capacityPercent + "%");
          fillStart.setAttribute("stop-color", this.rendererColors[0]);
          fillStop1.setAttribute("stop-color", this.rendererColors[0]);
          fillStop2.setAttribute("stop-color", this.rendererColors[0]);
          fillEnd.setAttribute("stop-color", this.rendererColors[0]);
        } else if (capacityPercent < this.colorDataStops[2]) {
          // this.percentCapacityNode.style.color = this.rendererColors[1];
          fillStop1.setAttribute("offset", capacityPercent + "%");
          fillStop2.setAttribute("offset", capacityPercent + "%");
          fillStop1.setAttribute("offset", capacityPercent - this.colorDataStops[1] + "%");
          fillStop2.setAttribute("offset", capacityPercent - this.colorDataStops[1] + "%");
          fillStart.setAttribute("stop-color", this.rendererColors[1]);
          fillStop1.setAttribute("stop-color", this.rendererColors[1]);
          fillStop2.setAttribute("stop-color", this.rendererColors[1]);
          fillEnd.setAttribute("stop-color", this.rendererColors[1]);
        } else {
          // this.percentCapacityNode.style.color = this.rendererColors[2];
          fillStop1.setAttribute("offset", capacityPercent - this.colorDataStops[2] + "%");
          fillStop2.setAttribute("offset", capacityPercent - this.colorDataStops[2] + "%");
          fillStart.setAttribute("stop-color", this.rendererColors[2]);
          fillStop1.setAttribute("stop-color", this.rendererColors[2]);
          fillStop2.setAttribute("stop-color", this.rendererColors[2]);
          fillEnd.setAttribute("stop-color", this.rendererColors[2]);
        }

      }
    },

    /**
     *  DISPLAY ANALYSIS DETAILS
     *   - TITLE AND DESCRIPTION
     */
    initializeAnalysisDetails: function () {

      if (!this.description) {
        if (this.layer.portalItem) {
          this.description = this.layer.portalItem.description || this.layer.portalItem.snippet || "Capacity Analysis Results";
        } else {
          this.description = "Capacity Analysis Results";
        }
      }

      const analysisDetails = {
        title: this.title,
        description: this.description
      };

      this.layerTitleNode.addEventListener('click', () => {
        this.displayDetailsCallback(analysisDetails);
      });

      this.layerTitleNode.classList.remove('btn-disabled');
    }

  });
  CapacityAnalysis.version = "0.0.1";


  return CapacityAnalysis;
});
