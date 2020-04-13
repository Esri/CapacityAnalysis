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
 * CapacityAnalysisUtils
 *  - Utilities for managing many capacity analysis results
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  4/7/2020 - 0.0.1 -
 * Modified:
 *
 */
define([
  "./CapacityAnalysisParameters",
  "./CapacityAnalysisResults",
  "./CapacityAnalysis",
  "esri/core/Accessor",
  "esri/core/promiseUtils",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/views/layers/FeatureLayerView"
], function(CapacityAnalysisParameters, CapacityAnalysisResults, CapacityAnalysis,
            Accessor, promiseUtils, MapView, FeatureLayer, FeatureLayerView){

  /**
   * UTILITIES TO MANAGE MULTIPLE CAPACITY ANALYSIS
   *
   * @type {Function}
   */
  const CapacityAnalysisUtils = Accessor.createSubclass({
    declaredClass: "CapacityAnalysisUtils",

    properties: {
      analysisParameters: { type: CapacityAnalysisParameters },
      firstDay: { type: Date },
      days: { type: Number, value: -1 },
      overagesMax: { type: Number, value: -Infinity },
      capacityAnalysisList: { type: Map },
      mapViews: { type: Array.of(MapView) },
      layers: { type: Array.of(FeatureLayer) },
      layerViews: { type: Array.of(FeatureLayerView) },
      defaultDataSources: { type: Object },
      allSourcesByFeature: { type: Map }
    },

    /**
     * INITIALIZE PARAMETERS
     */
    constructor: function(){

      // ANALYSIS PARAMETERS //
      this.analysisParameters = new CapacityAnalysisParameters();

      // LIST OF ANALYSIS //
      this.capacityAnalysisList = new Map();
      // MAP VIEWS //
      this.mapViews = [];
      // LAYERS //
      this.layers = [];
      // LAYER VIEWS //
      this.layerViews = [];

      // SOURCE BY FEATURE //
      this.allSourcesByFeature = new Map();

    },

    /**
     * CREATE ANALYSIS AND PROCESS RESULTS
     *
     * @param analysisSettings
     * @returns {Promise<CapacityAnalysis>}
     */
    addAnalysisResults: function(analysisSettings){
      return promiseUtils.create((resolve, reject) => {
        try {

          // CAPACITY ANALYSIS //
          const capacityAnalysis = new CapacityAnalysis({
            analysisParameters: this.analysisParameters,
            ...analysisSettings
          });
          capacityAnalysis.load().then(() => {

            // FIRST DAY //
            this.firstDay = this.firstDay
              ? new Date(Math.min(this.firstDay.valueOf(), capacityAnalysis.firstDay.valueOf()))
              : capacityAnalysis.firstDay;

            // DAYS //
            this.days = Math.max(this.days, capacityAnalysis.days);

            // OVERAGE MAX //
            this.overagesMax = Math.max(this.overagesMax, capacityAnalysis.overageMax);

            // ADD TO ANALYSIS LIST //
            this.capacityAnalysisList.set(capacityAnalysis.id, capacityAnalysis);

            // MAP VIEWS //
            this.mapViews.push(capacityAnalysis.mapView);
            // LAYERS //
            this.layers.push(capacityAnalysis.layer);
            // LAYER VIEWS //
            this.layerViews.push(capacityAnalysis.layerView);

            // RESOLVE //
            resolve();
          }).catch(reject);

        } catch(e) { reject(e); }
      });

    },

    /**
     * USER HAS ASKED TO RESET THE MAP VIEW EXTENTS //
     */
    resetMapViewExtent: function(){
      this.capacityAnalysisList.forEach(capacityAnalysis => {
        requestAnimationFrame(() => {
          capacityAnalysis.resetMapViewExtent();
        });
      });
    },

    /**
     *
     * TODO: THIS NEEDS MORE THOUGHT...
     *
     * ORGANIZE ACCORDING TO HOW CHART NEEDS THE DATA...
     *
     * @returns {{}}
     */
    createDefaultLayerSources: function(){

      this.defaultDataSources = this.analysisParameters.variables.reduce((sources, variable) => {

        // DATA SOURCE FOR VARIABLE //
        sources[variable] = {};

        // CAPACITY //
        //  - SHOULD BE THE SAME FOR ALL LAYERS //
        const capacity = this.capacityAnalysisList.get('left').layerAnalysisResults[variable].Capacity;
        sources[variable]['Hospital Capacity'] = {
          id: 'Hospital Capacity',
          title: 'Hospital Capacity',
          data: (new Array(this.days)).fill(capacity)
        };

        const leftAnalysis = this.capacityAnalysisList.get('left');
        sources[variable][leftAnalysis.id] = {
          id: leftAnalysis.id,
          title: leftAnalysis.title,
          data: leftAnalysis.layerAnalysisResults[variable].Counts
        };

        const rightAnalysis = this.capacityAnalysisList.get('right');
        sources[variable][rightAnalysis.id] = {
          id: rightAnalysis.id, 
          title: rightAnalysis.title,
          data: rightAnalysis.layerAnalysisResults[variable].Counts
        };

        return sources;
      }, {});

      return this.defaultDataSources;
    },

    /**
     *
     * TODO: THIS NEEDS MORE THOUGHT...
     *
     * ORGANIZE ACCORDING TO HOW CHART NEEDS THE DATA...
     *
     * @param featureID
     * @returns {{}}
     */
    getFeatureDataSources: function(featureID){

      let sourcesByFeature = this.allSourcesByFeature.get(featureID);
      if(!sourcesByFeature){
        sourcesByFeature = this.analysisParameters.variables.reduce((sources, variable) => {

          // LOCATION NAME //
          //  - SHOULD BE THE SAME FOR ALL LAYERS //
          const firstFeatureAnalysisResult = this.capacityAnalysisList.get('left').featureAnalysisResults[featureID];
          if(!sources.location){
            sources.location = firstFeatureAnalysisResult.title;
          }

          // DATA SOURCE FOR VARIABLE //
          sources[variable] = {};

          // CAPACITY //
          //  - SHOULD BE THE SAME FOR ALL LAYERS //
          let capacity = firstFeatureAnalysisResult[variable].Capacity;
          sources[variable]['Hospital Capacity'] = {
            id: 'Hospital Capacity',
            title: 'Hospital Capacity',
            data: (new Array(this.days)).fill(capacity)
          };

          // FEATURE ANALYSIS RESULTS FOR EACH LAYERS //
          const leftAnalysis = this.capacityAnalysisList.get('left');
          sources[variable][leftAnalysis.id] = {
            id: leftAnalysis.id,
            title: leftAnalysis.title,
            data: leftAnalysis.featureAnalysisResults[featureID][variable].Counts
          };

          const rightAnalysis = this.capacityAnalysisList.get('right');
          sources[variable][rightAnalysis.id] = {
            id: rightAnalysis.id,
            title: rightAnalysis.title,
            data: rightAnalysis.featureAnalysisResults[featureID][variable].Counts
          };

          return sources;
        }, {});

        this.allSourcesByFeature.set(featureID, sourcesByFeature);
      }
      return sourcesByFeature;
    }

  });
  CapacityAnalysisUtils.version = "0.0.1";

  return CapacityAnalysisUtils;
});


