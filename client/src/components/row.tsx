/**
 * A row of DOM elements.
 */

import * as React from 'react';

/**
 * Specifies the alignment of children.
 */
export enum RowAlign {
    Start = "flex-start",
    End = "flex-end",
    Center = "center",
    Baseline = "baseline",
    Stretch = "stretch",
}

export interface IRowProps {
    //
    // Specifies the alignment of children.
    //
    alignItems?: RowAlign;

    //
    // Class name for the child.
    //
    className?: string;
}

export class Row extends React.Component<IRowProps, {}> {

    render() {
        return (
            <div 
                className={this.props.className}
                style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: this.props.alignItems || RowAlign.Center,
                }}
                >
                {this.props.children}
            </div>
        );
    }
}