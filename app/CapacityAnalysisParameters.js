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
 * CapacityAnalysisParameters
 *  - Capacity analysis result parameters
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  4/7/2020 - 0.0.1 -
 * Modified:
 *
 */

define([
  "esri/core/Accessor"
], function(Accessor){

  const CapacityAnalysisParameters = Accessor.createSubclass({
    declaredClass: "CapacityAnalysisParameters",

    properties: {
      variables: {
        type: Array.of(String),
        value: ['Hospitalized', 'ICU', 'Ventilated']
      },
      requiredFields: {
        type: Array.of(String)
      },
      sourceFields: {
        type: Object,
        value: {
          'ID': 'SOURCE_ID',
          'NAME': 'web_name',
          'DAYS': 'web_days',
          'FIRST_DAY': 'web_date'
        }
      },
      variableFields: {
        type: Object,
        value: {
          'Hospitalized': {
            'CAPACITY': 'hcap_input',
            'COUNTS': 'web_chosp',
            'PEAK': 'pk_hsp',
            'OVER_MAX': 'oc_hos_max'
          },
          'ICU': {
            'CAPACITY': 'icap_input',
            'COUNTS': 'web_cicu',
            'PEAK': 'pk_icu',
            'OVER_MAX': 'oc_icu_max'
          },
          'Ventilated': {
            'CAPACITY': 'vcap_input',
            'COUNTS': 'web_cvent',
            'PEAK': 'pk_vnt',
            'OVER_MAX': 'oc_vnt_max'
          }
        }
      },
      units: {
        type: Object,
        value: {
          'Hospitalized': 'beds',
          'ICU': 'beds',
          'Ventilated': 'ventilators'
        }
      },
      separator: {
        type: String,
        value: '|'
      },
      rendererColors: {
        type: Array.of(String),
        value: ["#bababa", "#f4a582", "#ca0020"]
      },
      colorDataStops: {
        type: Array.of(Number),
        value: [0, 100, 200]
      }
    },

    /**
     * 
     */
    constructor: function(){

      // REQUIRED FIELDS SET //
      const requiredFieldsSet = new Set();
      // ADD FIELD INFO //
      const _addFieldInfo = fieldsObject => {
        for(let key in fieldsObject){
          if(fieldsObject.hasOwnProperty(key)){
            requiredFieldsSet.add(fieldsObject[key]);
          }
        }
      };

      // SOURCE FIELDS //
      _addFieldInfo(this.sourceFields);

      // VARIABLE FIELDS //
      for(let variableField in this.variableFields){
        if(this.variableFields.hasOwnProperty(variableField)){
          _addFieldInfo(this.variableFields[variableField]);
        }
      }

      // REQUIRED FIELDS //
      this.requiredFields = Array.from(requiredFieldsSet.values());

    },

    /**
     *
     * @param featureLayer
     * @returns {{isValid: boolean, error: Error}}
     */
    isValidLayer: function(featureLayer){

      // LAYER FIELDS //
      const layerFieldNames = featureLayer.fields.map(f => f.name);

      // MISSING FIELD ERROR //
      let missingFieldError = null;

      // CHECK FIELD NAMES //
      const isValid = this.requiredFields.every(requiredFieldName => {
        const hasField = layerFieldNames.includes(requiredFieldName);
        if(!hasField){
          missingFieldError = new Error(`MISSING FIELD: '${requiredFieldName}' in  ${featureLayer.title}`);
        }
        return hasField;
      });

      return { valid: isValid, error: missingFieldError };
    }

  });
  CapacityAnalysisParameters.version = "0.0.1";

  return CapacityAnalysisParameters;
});
