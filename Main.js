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

define([
  "calcite",
  "dojo/_base/declare",
  "ApplicationBase/ApplicationBase",
  "dojo/i18n!./nls/resources",
  "ApplicationBase/support/itemUtils",
  "ApplicationBase/support/domHelper",
  "dojo/date",
  "esri/kernel",
  "esri/identity/IdentityManager",
  "esri/core/watchUtils",
  "esri/core/promiseUtils",
  "esri/portal/Portal",
  "esri/widgets/Slider",
  "./CapacityAnalysisUtils"
], function(calcite, declare, ApplicationBase, i18n, itemUtils, domHelper, date,
            esriNS, IdentityManager, watchUtils, promiseUtils,
            Portal, Slider, CapacityAnalysisUtils){

  return declare([], {

    /**
     *
     */
    constructor: function(){
      // BASE //
      this.base = null;
      // CALCITE WEB //
      calcite.init();
    },

    /**
     * INITIALIZE WITH APPLICATION BASE
     *
     * @param base
     */
    init: function(base){
      if(!base){
        console.error("ApplicationBase is not defined");
        return;
      }

      // APPLICATION BASE //
      this.base = base;
      domHelper.setPageLocale(this.base.locale);
      domHelper.setPageDirection(this.base.direction);

      // THEME BACKGROUND AND TEXT COLORS //
      document.documentElement.style.setProperty('--theme-text-color', this.base.config.ThemeTextColor);
      document.documentElement.style.setProperty('--theme-background-color', this.base.config.ThemeBackgroundColor);

      // WEB MAP ITEM //
      const webMapItem = this.base.results.webMapItems[0].value;
      if(!webMapItem){
        console.error("Could not load Web Map");
        return;
      }

      // APPLICATION ITEM //
      const applicationItem = this.base.results.applicationItem.value;
      const appProxies = (applicationItem && applicationItem.appProxies) ? applicationItem.appProxies : null;
      const viewProperties = itemUtils.getConfigViewProperties(this.base.config);

      //
      // APPLICATION TITLE //
      //
      this.base.config.title =
        this.base.config.title
        || this.base.config.ApplicationTitle
        || itemUtils.getItemTitle(webMapItem);
      // APPLICATION TITLE //
      domHelper.setPageTitle(this.base.config.title);
      document.getElementById("app-title-node").innerHTML = this.base.config.title;
      document.getElementById("app-details-title").innerHTML = this.base.config.title;

      //
      // APPLICATION DETAILS //
      //
      this.base.config.AnalysisDetails =
        this.base.config.AnalysisDetails
        || webMapItem.description
        || (applicationItem && applicationItem.description)
        || (applicationItem && applicationItem.snippet)
        || 'Compare Capacity Analysis Results';
      // APPLICATION DETAILS //
      document.getElementById("app-details-panel").innerHTML = this.base.config.AnalysisDetails;

      // CREATE MAP //
      itemUtils.createMapFromItem({ item: webMapItem, appProxies: appProxies }).then(map => {
        // APPLICATION IS READY //
        this.applicationReady(map, viewProperties);
      });

    },

    /**
     * HANDLE ERRORS
     *
     * @param error
     * @private
     */
    _displayError: function(error){
      console.error(error);

      const errorPanel = document.getElementById('error-panel');
      errorPanel.innerHTML = error ? error.message : 'Unknown Error';
      errorPanel.title = JSON.stringify(error);

      calcite.bus.emit('modal:open', { id: 'error-dialog' });
    },

    /**
     * APPLICATION IS READY
     *
     * @param map
     * @param viewProperties
     */
    applicationReady: function(map, viewProperties){

      // CAPACITY ANALYSIS UTILS //
      this.capacityAnalysisUtils = new CapacityAnalysisUtils();

      // ANALYSIS PARAMETERS //
      this.analysisParameters = this.capacityAnalysisUtils.analysisParameters;
      // RENDERER COLORS //
      this.rendererColors = this.analysisParameters.rendererColors;
      // RENDERER COLOR STOPS //
      this.colorDataStops = this.analysisParameters.colorDataStops;

      // DAY SLIDER AND VARIABLE SELECT //
      this.initializeDayAndVariable();

      // ARCADE EXPRESSIONS //
      this.initializeArcadeExpressions(this.analysisParameters);

      // ANALYSIS DETAILS DIALOG //
      const analysisDetailsDialog = document.getElementById('analysis-details-dialog');
      const analysisDetailsTitle = analysisDetailsDialog.querySelector(".analysis-details-title");
      const analysisDetailsDescription = analysisDetailsDialog.querySelector(".analysis-details-panel");

      // DISPLAY ANALYSIS DETAILS //
      this.displayAnalysisDetails = ({ title, description }) => {
        analysisDetailsTitle.innerHTML = title;
        analysisDetailsDescription.innerHTML = description;
        calcite.bus.emit('modal:open', { id: 'analysis-details-dialog' });
      };

      // DEBUG - LAYER IDS //
      //console.info(map.layers.map(l => {return `${l.title}: ${l.id}`}).join(' | '));

      // MAKE SURE WE HAVE THE CONFIGURED LAYERS //
      this.getAnalysisLayer('Left Panel', map, this.base.config.LeftPanelLayer.id).then(leftLayer => {
        this.getAnalysisLayer('Right Panel', map, this.base.config.RightPanelLayer.id).then(rightLayer => {

          // ANALYSIS SETTINGS //
          const analysisSettings = [
            {
              id: "left",
              container: document.getElementById('left-analysis-panel'),
              viewProperties: viewProperties,
              map: map,
              layer: leftLayer,
              title: this.base.config.LeftPanelTitle || leftLayer.title,
              description: this.base.config.LeftPanelDescription,
              dataColor: this.base.config.LeftPanelColor,
              displayDetailsCallback: this.displayAnalysisDetails
            },
            {
              id: "right",
              container: document.getElementById('right-analysis-panel'),
              viewProperties: viewProperties,
              map: map,
              layer: rightLayer,
              title: this.base.config.RightPanelTitle || rightLayer.title,
              description: this.base.config.RightPanelDescription,
              dataColor: this.base.config.RightPanelColor,
              displayDetailsCallback: this.displayAnalysisDetails
            }
          ];

          // VISUALIZE ANALYSIS RESULTS //
          const analysisHandles = analysisSettings.map(analysisSetting => {
            //
            // TODO: TOO MANY OTHER THINGS HAVE CHANGED... RETHINK THIS...
            //
            return this.capacityAnalysisUtils.addAnalysisResults(analysisSetting).then().catch(this._displayError);

          });
          promiseUtils.eachAlways(analysisHandles).then(() => {

            // FIRST DAY AND DAYS //
            const days = this.capacityAnalysisUtils.days;
            const firstDay = this.capacityAnalysisUtils.firstDay;

            //
            // ALL ANALYSIS RESULTS //
            //
            const allLayerAnalysis = this.capacityAnalysisUtils.capacityAnalysisList;
            //
            // ALL MAP VIEWS //
            //
            const mapViews = this.capacityAnalysisUtils.mapViews;
            //
            // ALL LAYERS //
            //
            const layers = this.capacityAnalysisUtils.layers;
            //
            // ALL LAYERVIEWS //
            //
            const layerViews = this.capacityAnalysisUtils.layerViews;

            //
            // DEFAULT LAYER SOURCES //
            //
            this.defaultDataSources = this.capacityAnalysisUtils.createDefaultLayerSources();

            // RENDERERS //
            // - TODO: PUSH INTO CAPACITYANALYSIS CLASS...
            this.initializeRenderers(layers, this.capacityAnalysisUtils.overagesMax);

            // POPUP TEMPLATES //
            // - TODO: PUSH INTO CAPACITYANALYSIS CLASS...
            this.initializePopupTemplate(layers, this.analysisParameters);

            // INITIALIZE SLIDER //
            this.initializeSlider(firstDay, days);

            // INITIALIZE CHART //
            this.initializeChart({ firstDay, days, allLayerAnalysis });

            // MAP INTERACTIONS //
            this.initializeMapInteractions({ mapViews, layerViews });

            // VIEW SYNC //
            this.initializeViewSync(mapViews);

            // SET INITIAL STATE //
            this.updateRenderersFromSelect();

          }).catch(this._displayError);
        }).catch(this._displayError);
      }).catch(this._displayError);

    },

    /**
     * GET ANALYSIS LAYER
     *  - FIND, LOAD, AND VALIDATE
     *
     * @param source
     * @param map
     * @param layerId
     * @returns {Promise<FeatureLayer>}
     */
    getAnalysisLayer: function(source, map, layerId){
      return promiseUtils.create((resolve, reject) => {
        const layer = map.findLayerById(layerId);
        if(layer){
          layer.load().then(() => {
            const validInfo = this.analysisParameters.isValidLayer(layer);
            if(validInfo.valid){
              resolve(layer);
            } else {
              reject(validInfo.error);
            }
          }).catch(reject);
        } else {
          reject(new Error(`Can't find '${source}' layer.`));
        }
      });
    },

    /**
     * CURRENT DAY AND VARIABLE
     */
    initializeDayAndVariable: function(){

      // CURRENT VARIABLE //
      //  - Hospitalized | ICU |  Ventilated //
      //  - this.analysisParameters.variables
      //  - TODO: BUILD SELECT OPTIONS HERE?
      this.variable = "Hospitalized";

      // CURRENT DAY //
      this.day = 0;

      //
      // VARIABLE SELECT //
      //
      const variableSelect = document.getElementById("variableSelect");
      this.updateRenderersFromSelect = () => {
        this.variable = variableSelect.value;

        this.updateChart();
        this.updatePopupTemplates(this.day);
        this.updateRenderers({ day: this.day, variable: this.variable });

      };
      variableSelect.addEventListener("change", this.updateRenderersFromSelect);

      //
      // RESET //
      //
      const resetBtn = document.getElementById("reset-btn");
      resetBtn.addEventListener("click", () => {

        this.day = 0;
        this.slider.viewModel.setValue(0, this.day);

        this.resetDefaultChartDataSources();
        this.updatePopupTemplates(this.day);
        this.updateRenderers({ day: this.day, variable: this.variable });

        this.clearMapInteractions();

        this.capacityAnalysisUtils.resetMapViewExtent();

      });

    },

    /**
     * DAY SLIDER
     *
     * @param firstDay
     * @param days
     */
    initializeSlider: function(firstDay, days){

      const dateFormat = Intl.DateTimeFormat('default', { month: 'short', day: 'numeric' });

      const elementSettings = (Number(esriNS.version) >= 4.15)
        ? { visibleElements: { labels: true, rangeLabels: true } }
        : { rangeLabelsVisible: true, labelsVisible: true };

      this.slider = new Slider({
        container: "slider-container",
        min: 0,
        max: (days - 1),
        values: [0],
        steps: 1,
        precision: 0,
        ...elementSettings,
        labelInputsEnabled: false,
        labelFormatFunction: function(value, type){
          return dateFormat.format(date.add(firstDay, 'day', value));
        }
      });

      this.slider.on(["thumb-change", "thumb-drag"], sliderEvt => {
        this.day = this.slider.values[0];

        requestAnimationFrame(() => {
          this.updateChartDay(this.day);
          this.updatePopupTemplates(this.day);
          this.updateRenderers({ day: this.day, variable: this.variable });
        });

      });

    },

    /**
     * ARCADE EXPRESSIONS
     *  - USED IN POPUPS AND RENDERER
     *
     * @param analysisParameters
     */
    initializeArcadeExpressions: function(analysisParameters){

      this.getPercentCapacityExpression = function({ variable, day }){

        const countsField = analysisParameters.variableFields[variable].COUNTS;
        const capacityField = analysisParameters.variableFields[variable].CAPACITY;

        return `$feature.${countsField};
                $feature.${capacityField};   
                var hospitalized = Max(0,Number(Split($feature.${countsField},'${analysisParameters.separator}')[${day}]));
                var capacity = IIF($feature.${capacityField} < 1, 1, $feature.${capacityField});              
                return (hospitalized / capacity ) * 100;`;
      };

      this.getOveragesExpression = function({ variable, day }){

        const countsField = analysisParameters.variableFields[variable].COUNTS;
        const capacityField = analysisParameters.variableFields[variable].CAPACITY;

        return `$feature.${countsField};
                $feature.${capacityField};                                                     
                var hospitalized = Max(0,Number(Split($feature.${countsField},'${analysisParameters.separator}')[${day}]));                            
                var capacity = IIF($feature.${capacityField} < 1, 1, $feature.${capacityField});
                return (hospitalized - capacity);`;
      };

      this.getFieldValueFromExpression = function({ variable, day }){

        const countsField = analysisParameters.variableFields[variable].COUNTS;

        return `$feature.${countsField};
                return Max(0,Number(Split($feature.${countsField},'${analysisParameters.separator}')[${day}]));`
      };

    },

    /**
     * LAYER RENDERERS
     *
     * @param layers
     * @param overagesMax
     */
    initializeRenderers: function(layers, overagesMax){

      // UPDATE RENDERERS //
      this.updateRenderers = ({ variable, day }) => {

        // UPDATE LAYERS RENDERERS //
        layers.forEach(layer => {

          // SET LAYER RENDERER //
          layer.renderer = {
            type: "simple",
            symbol: {
              type: "simple-marker",
              color: this.rendererColors[0],
              size: 2,
              outline: {
                width: 0.5,
                color: [200, 200, 200, 0.5]
              }
            },
            visualVariables: [
              {
                type: "color",
                valueExpression: this.getPercentCapacityExpression({ variable, day }),
                valueExpressionTitle: "Hospital Stress",
                stops: [
                  { value: this.colorDataStops[0], color: this.rendererColors[0], label: "under capacity" },
                  { value: this.colorDataStops[1], color: this.rendererColors[1], label: "100% capacity" },
                  { value: this.colorDataStops[2], color: this.rendererColors[2], label: "> 200% capacity" },
                ]
              },
              {
                type: "size",
                valueExpressionTitle: "Number of patients above capacity",
                valueExpression: this.getOveragesExpression({ variable, day }),
                minSize: {
                  type: "size",
                  valueExpression: "$view.scale",
                  stops: [
                    { value: 3898785, size: 10 },
                    { value: 7797571, size: 7 },
                    { value: 15595143, size: 4 },
                    { value: 31190287, size: 2 }
                  ]
                },
                maxSize: {
                  type: "size",
                  valueExpression: "$view.scale",
                  stops: [
                    { value: 3898785, size: 44 },
                    { value: 7797571, size: 32 },
                    { value: 15595143, size: 24 },
                    { value: 31190287, size: 18 }
                  ]
                },
                minDataValue: 1,
                maxDataValue: overagesMax
              }
            ]
          };

        });
      };

    },

    /**
     * LAYER POPUPTEMPLATES
     *
     * @param layers
     * @param analysisParameters
     */
    initializePopupTemplate: function(layers, analysisParameters){

      const sourceFields = analysisParameters.sourceFields;
      const variableFields = analysisParameters.variableFields;

      this.updatePopupTemplates = day => {

        layers.forEach(layer => {
          layer.popupTemplate = {
            title: `{${sourceFields.NAME}}`,
            content: [{
              type: "fields",
              fieldInfos: [
                {
                  fieldName: `expression/_Hospitalized`,
                  label: "Hospitalized",
                  format: { digitSeparator: true, places: 0 }
                },
                {
                  fieldName: `expression/_ICU`,
                  label: "ICU Patients",
                  format: { digitSeparator: true, places: 0 }
                },
                {
                  fieldName: `expression/_Ventilated`,
                  label: "Ventilators",
                  format: { digitSeparator: true, places: 0 }
                },
                {
                  fieldName: "expression/hospital-overages",
                  label: "Hospital patient overage",
                  format: { digitSeparator: true, places: 0 }
                },
                {
                  fieldName: variableFields.Hospitalized.PEAK,
                  label: "Maximum patients hospitalized in a single day",
                  format: { digitSeparator: true, places: 0 }
                },
                {
                  fieldName: variableFields.ICU.PEAK,
                  label: "Maximum patients in ICU in a single day",
                  format: { digitSeparator: true, places: 0 }
                },
                {
                  fieldName: variableFields.Ventilated.PEAK,
                  label: "Maximum patients on ventilator in a single day",
                  format: { digitSeparator: true, places: 0 }
                },
                {
                  fieldName: variableFields.Hospitalized.OVER_MAX,
                  label: "Number of days hospital beds over capacity",
                  format: { digitSeparator: true, places: 0 }
                },
                {
                  fieldName: variableFields.ICU.OVER_MAX,
                  label: "Number of days ICU beds over capacity",
                  format: { digitSeparator: true, places: 0 }
                },
                {
                  fieldName: variableFields.Ventilated.OVER_MAX,
                  label: "Number of days ventilators over capacity",
                  format: { digitSeparator: true, places: 0 }
                }
              ]
            }],
            expressionInfos: [
              {
                name: "_Hospitalized",
                title: "Hospitalized",
                expression: this.getFieldValueFromExpression({ variable: 'Hospitalized', day: day }),
                returnType: "number"
              },
              {
                name: "_ICU",
                title: "ICU Patients",
                expression: this.getFieldValueFromExpression({ variable: 'ICU', day: day }),
                returnType: "number"
              },
              {
                name: "_Ventilated",
                title: "Ventilators",
                expression: this.getFieldValueFromExpression({ variable: 'Ventilated', day: day }),
                returnType: "number"
              },
              {
                name: "hospital-overages",
                title: "Hospital patient overage",
                expression: this.getOveragesExpression({ variable: 'Hospitalized', day: day }),
                returnType: "number"
              }
            ]
          }
        });
      };

    },

    /**
     * MAP INTERACTIONS
     *  - VIEWS HIGHLIGHT AND POPUP
     *
     * @param mapViews
     * @param layerViews
     */
    initializeMapInteractions: function({ mapViews, layerViews }){

      // OBJECTID FIELD //
      const objectIdField = layerViews[0].layer.objectIdField;

      // HIGHLIGHTS //
      const highlightByLayerId = new Map();
      layerViews.forEach(layerView => {
        highlightByLayerId.set(layerView.layer.id, null);
      });

      // CLEAR HIGHLIGHTS AND POPUPS //
      this.clearMapInteractions = () => {
        layerViews.forEach(layerView => {
          const highlight = highlightByLayerId.get(layerView.layer.id);
          highlight && highlight.remove();
        });
        mapViews.forEach(mapView => {
          mapView.popup.close();
        });
      };

      // SET MAP HIGHLIGHTS AND POPUPS //
      this.setMapInteraction = (oid) => {
        layerViews.forEach(layerView => {
          highlightByLayerId.set(layerView.layer.id, layerView.highlight(oid));
        });
        mapViews.forEach((mapView, mapViewIdx) => {
          layerViews[mapViewIdx].queryFeatures({ objectIds: [oid] }).then(popupFS => {
            if(popupFS.features.length){
              mapView.popup.open({ features: [popupFS.features[0]] });
            }
          });
        });
      };

      // LAYER IDS //
      const layerIds = layerViews.map(layerView => layerView.layer.id);

      // MAPVIEWS CLICK EVENT HANDLERS //
      mapViews.forEach((mapView, mapViewIdx) => {

        // MAPVIEW CLICK EVENT HANDLER //
        mapView.on("click", clickEvt => {

          // CLEAR MAP INTERACTIONS //
          this.clearMapInteractions();

          // MAPVIEW HITTEST //
          mapView.hitTest(clickEvt).then(hitResults => {

            // GET VALID HITTEST RESULT //
            const hitResult = hitResults.results.find(result => {
              return (result.graphic && result.graphic.layer && layerIds.includes(result.graphic.layer.id));
            });
            if(hitResult){

              // HITTEST RESULT //
              const attributes = hitResult.graphic.attributes;
              const oid = attributes[objectIdField];
              const featureId = attributes[this.analysisParameters.sourceFields.ID];

              // CENTER MAP OVER FEATURE //
              mapView.goTo({ target: hitResult.graphic, scale: mapView.scale }).then(() => {

                // SET MAP INTERACTIONS //
                this.setMapInteraction(oid);

                // GET FEATURE SOURCES //
                const dataSources = this.capacityAnalysisUtils.getFeatureDataSources(featureId);
                // SET CHART SOURCE //
                this.setChartDataSources(dataSources);

              });

            }
          });
        });
      });

    },

    /**
     * CHART
     *
     * @param firstDay
     * @param days
     * @param allLayerAnalysis
     */
    initializeChart: function({ firstDay, days, allLayerAnalysis }){

      // LABELS //
      let daysLabels = [];
      let startDay = 0;
      while(startDay < days){

        const months = {
          4: "Apr",
          34: "May",
          65: "June",
          95: "July",
          126: "Aug",
          156: "Sep",
          186: "Oct",
          217: "Nov",
          247: "Dec",
          278: "Jan",
          309: "Feb",
          331: "Mar",
          360: "Apr"
        };

        if(months[startDay]){
          daysLabels.push(months[startDay]);
        } else {
          daysLabels.push("");
        }
        startDay++;
      }

      // POINT SIZE //
      const chartPointSize = 5;
      const pointRadii = (new Array(days)).fill(0);
      pointRadii[0] = chartPointSize;

      // DATA SOURCES //
      let _dataSources = this.defaultDataSources;

      // CAPACITY DATASET //
      const capacityDataset = {
        //label: _dataSources[this.variable]['Hospital Capacity'].title,
        label: 'Hospital Capacity',
        pointRadius: pointRadii,
        backgroundColor: "rgba(0, 0, 0, 0)",
        borderColor: "#525966",
        data: _dataSources[this.variable]['Hospital Capacity'].data,
        fill: false,
        borderWidth: 2,
        borderDash: [5, 5]
      };

      // LEFT DATASET //
      const leftAnalysis = allLayerAnalysis.get('left');
      const leftDataset = {
        label: `${_dataSources[this.variable]['left'].title} ${this.variable}`,
        pointRadius: pointRadii,
        backgroundColor: leftAnalysis.dataColor,
        borderColor: leftAnalysis.dataColor,
        data: _dataSources[this.variable]['left'].data,
        fill: false,
      };

      // RIGHT DATASET //
      const rightAnalysis = allLayerAnalysis.get('right');
      const rightDataset = {
        label: `${_dataSources[this.variable]['right'].title} ${this.variable}`,
        pointRadius: pointRadii,
        backgroundColor: rightAnalysis.dataColor,
        borderColor: rightAnalysis.dataColor,
        data: _dataSources[this.variable]['right'].data,
        fill: false,
      };

      // CHAR PANEL //
      const chartPanel = document.getElementById('chart-panel');
      const patientsChartNode = document.createElement('canvas');
      patientsChartNode.setAttribute('id', 'patients-chart');
      chartPanel.appendChild(patientsChartNode);

      //
      // CHART //
      //
      const patientsChart = new Chart(patientsChartNode.getContext("2d"), {
        type: "line",
        data: {
          labels: daysLabels,
          datasets: [capacityDataset, leftDataset, rightDataset]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          legend: { display: true },
          title: { display: true, text: `Number of ${this.variable} Patients` },
          scales: {
            xAxes: [
              {
                gridLines: { display: false },
                ticks: {
                  min: 1,
                  max: days,
                  stepSize: 1,
                  autoSkip: false
                }
              }
            ],
            yAxes: [
              {
                ticks: {
                  enabled: false,
                  min: 0,
                  callback: (label, index, labels) => {
                    return (new Intl.NumberFormat().format(label / 1000)) + " k";
                  }
                }
              }
            ]
          }
        }
      });

      // RESET OT DEFAULT LAYERS SOURCE //
      this.resetDefaultChartDataSources = function(){
        this.setChartDataSources(this.defaultDataSources)
      };

      // UPDATE CHART SOURCE //
      //  - LAYERS OR FEATURE
      this.setChartDataSources = dataSources => {
        _dataSources = dataSources;
        this.updateChart();
      };

      // UPDATE CHART //
      //  - AFTER SOURCE OR VARIABLE CHANGE //
      this.updateChart = function(){

        // DATA SOURCE //
        const dataSource = _dataSources[this.variable];

        // CHART TITLE //
        patientsChart.options.title.text = _dataSources.location
          ? `Number of ${this.variable} Patients in ${_dataSources.location}`
          : `Number of ${this.variable} Patients`;

        // CHART DATASETS //
        patientsChart.data.datasets[0].data = dataSource['Hospital Capacity'].data;

        patientsChart.data.datasets[1].label = `${dataSource['left'].title} ${this.variable}`;
        patientsChart.data.datasets[1].data = dataSource['left'].data;

        patientsChart.data.datasets[2].label = `${dataSource['right'].title} ${this.variable}`;
        patientsChart.data.datasets[2].data = dataSource['right'].data;

        this.updateChartDay(this.day);

        this.updateCounts();

      };

      // UPDATE CHART DAY //
      //  - AFTER DAY CHANGE //
      this.updateChartDay = function(day){

        patientsChart.data.datasets.forEach((dataset, datasetIdx) => {
          dataset.pointRadius.fill(0);
          dataset.pointRadius[day] = chartPointSize;
        });
        patientsChart.update();

        this.updateCounts();

      };

      // UPDATE COUNTS //
      this.updateCounts = function(){

        // DATA SOURCE //
        const dataSource = _dataSources[this.variable];

        // CAPACITY AND UNITS //
        const units = this.analysisParameters.units[this.variable];
        const capacity = dataSource['Hospital Capacity'].data[this.day];

        // UPDATE COUNTS MESSAGE //
        allLayerAnalysis.forEach(layerAnalysis => {
          const count = dataSource[layerAnalysis.id].data[this.day];
          layerAnalysis.updateCounts({ count, capacity, units });
        });

      }

    },

    /**
     * SYNCHRONIZE MAP VIEWS
     *
     * @param views
     */
    initializeViewSync: function(views){

      /**
       * utility method that synchronizes the viewpoint of a view to other views
       */
      const synchronizeView = function(view, others){
        others = Array.isArray(others) ? others : [others];

        var viewpointWatchHandle;
        var viewStationaryHandle;
        var otherInteractHandlers;
        var scheduleId;

        var clear = function(){
          if(otherInteractHandlers){
            otherInteractHandlers.forEach(function(handle){
              handle.remove();
            });
          }
          viewpointWatchHandle && viewpointWatchHandle.remove();
          viewStationaryHandle && viewStationaryHandle.remove();
          scheduleId && clearTimeout(scheduleId);
          otherInteractHandlers = viewpointWatchHandle = viewStationaryHandle = scheduleId = null;
        };

        var interactWatcher = view.watch("interacting,animation", function(
          newValue
        ){
          if(!newValue){
            return;
          }
          if(viewpointWatchHandle || scheduleId){
            return;
          }

          // start updating the other views at the next frame
          scheduleId = setTimeout(function(){
            scheduleId = null;
            viewpointWatchHandle = view.watch("viewpoint", function(
              newValue
            ){
              others.forEach(function(otherView){
                otherView.viewpoint = newValue;
              });
            });
          }, 0);

          // stop as soon as another view starts interacting, like if the user starts panning
          otherInteractHandlers = others.map(function(otherView){
            return watchUtils.watch(
              otherView,
              "interacting,animation",
              function(value){
                if(value){
                  clear();
                }
              }
            );
          });

          // or stop when the view is stationary again
          viewStationaryHandle = watchUtils.whenTrue(
            view,
            "stationary",
            clear
          );
        });

        return {
          remove: function(){
            this.remove = function(){};
            clear();
            interactWatcher.remove();
          }
        };
      };

      /**
       * utility method that synchronizes the viewpoints of multiple views
       */
      const synchronizeViews = function(views){
        var handles = views.map(function(view, idx, views){
          var others = views.concat();
          others.splice(idx, 1);
          return synchronizeView(view, others);
        });

        return {
          remove: function(){
            this.remove = function(){};
            handles.forEach(function(h){
              h.remove();
            });
            handles = null;
          }
        };
      };

      // bind the views //
      synchronizeViews(views);

    }


  });
});
