# CapacityAnalysis
Capacity Analysis is a configurable app template that allows users to visualize and compare two outputs of the [CHIME model geoprocessing tool](https://www.arcgis.com/home/item.html?id=37ad6eb0d1034cd58844314a9b305de2) in side-by-side maps.  This includes a chart visualizing the projected hospital beds, ICU beds, and ventilators needed to treat patients across the entire dataset for both models. 

Users can use the slider to explore and compare capacity overages between the two models for each variable on a day-by-day basis. They can also interact with individual features to see how the projection curves for each variable differ from one geography to the next for each model. 

View the 'Models and Maps Explore Covid-19 Surges and Capacity to Help Officials Prepare' blog post for more details on CHIME.

View the [blog](https://www.esri.com/about/newsroom/blog/models-maps-explore-covid-19-surges-capacity/) for more details.

# Data Requirements 
 This app requires a web map that contains the data output from the [Chime Model geoprocessing tool](https://www.arcgis.com/home/item.html?id=37ad6eb0d1034cd58844314a9b305de2). 

# Configuration Options 

The app has several customization options including: 
- Data: Select a web map that contains the output of the CHIME model and then specify which layer should show up in the left pane and which in the right pane. 
- Theme: Modify the background, panel colors and text colors used in the app. 
- Text: The app title and description can be modified to suit your needs. 

## Supported devices 
This app is designed to support use in browsers on desktop and tablets. 

## Instructions

1. Fork and then clone the repo.
2. Run `npm install`
3. Host on local web server.
4. Open index.html in a web browser.
5. Test with different web maps.

Note: If you are installing this in ArcGIS Enterprise 10.8 you'll want to use the index_414.html file instead of index.html. 

## Requirements

- Notepad or your favorite HTML editor
- Web browser with access to the Internet

## Resources

- [ArcGIS for JavaScript API Resource Center](http://help.arcgis.com/en/webapi/javascript/arcgis/index.html)
- [ArcGIS Blog](http://blogs.esri.com/esri/arcgis/)
- [twitter@esri](http://twitter.com/esri)

## Issues

Find a bug or want to request a new feature? Please let us know by submitting an issue.

## Contributing

Esri welcomes contributions from anyone and everyone. Please see our [guidelines for contributing](https://github.com/esri/contributing).

## Licensing

Copyright 2020 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [license.txt](license.txt) file.
