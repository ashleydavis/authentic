import * as React from "react";
import * as ReactDOM from "react-dom";
import { AppUI } from './app/app';

declare const document: HTMLDocument;

ReactDOM.render(
    <AppUI />,
    document.getElementById("root")
);

declare let module: any;

if (module.hot) {
    module.hot.accept();
}
