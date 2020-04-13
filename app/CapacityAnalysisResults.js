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
 * CapacityAnalysisResults
 *  - Results of  the CHIME capacity analysis
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  4/7/2020 - 0.0.1 -
 * Modified:
 *
 */
define([
  "esri/core/Accessor"
], function(Accessor){

  const _CapacityAnalysisResult = Accessor.createSubclass({
    declaredClass: "_CapacityAnalysisResult",

    properties: {
      days: {
        type: Number,
        set: function(days){
          this._set('days', days || 366);
          this.Capacity = 0;
          this.Counts = (new Array(this.days)).fill(0);
        }
      },
      Capacity: {
        type: Number
      },
      Counts: {
        type: [Number]
      }
    }

  });
  _CapacityAnalysisResult.version = "0.0.1";

  const CapacityAnalysisResults = Accessor.createSubclass({
    declaredClass: "CapacityAnalysisResults",

    properties: {
      title: {
        type: String
      },
      Hospitalized: {
        type: _CapacityAnalysisResult
      },
      ICU: {
        type: _CapacityAnalysisResult
      },
      Ventilated: {
        type: _CapacityAnalysisResult
      },
      days: {
        type: Number,
        set: function(days){
          this._set('days', days || 366);
          this.Hospitalized = new _CapacityAnalysisResult({ days });
          this.ICU = new _CapacityAnalysisResult({ days });
          this.Ventilated = new _CapacityAnalysisResult({ days });
        }
      }
    }

  });
  CapacityAnalysisResults.version = "0.0.1";

  return CapacityAnalysisResults;
});
