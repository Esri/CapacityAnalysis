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

(function () {
  const _a = window.location;
  const pathname = _a.pathname;
  const search = _a.search;
  const distPath = pathname.substring(0, pathname.lastIndexOf("/"));
  const dojoLocale = search.match(/locale=([\w-]+)/) ? RegExp.$1 : undefined;
  const config = {
    async: true,
    locale: dojoLocale,
    packages: [{
        name: "calcite",
        location: "https://s3-us-west-1.amazonaws.com/patterns.esri.com/files/calcite-web/1.2.5/js",
        main: "calcite-web.min"
      },
      {
        name: "config",
        location: distPath + "/config"
      },
      {
        name: "ApplicationBase",
        location: distPath + "/application-base-js",
        main: "ApplicationBase"
      },
      {
        name: "Application",
        location: distPath + "/app",
        main: "Main"
      }
    ]
  };
  window["dojoConfig"] = config;
})();
