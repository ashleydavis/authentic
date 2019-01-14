/**
 * A column of DOM elements.
 */

import * as React from 'react';

/**
 * Specifies the alignment of children.
 */
export enum ColumnAlign {
    Start = "flex-start",
    End = "flex-end",
    Center = "center",
    Baseline = "baseline",
    Stretch = "stretch",
}

export interface IColumnProps {
    //
    // Specifies the alignment of children.
    //
    alignItems?: ColumnAlign;

    //
    // Class name for the child.
    //
    className?: string;
}

export class Column extends React.Component<IColumnProps, {}> {

    render() {
        return (
            <div 
                className={this.props.className}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: this.props.alignItems || ColumnAlign.Center,
                }}
                >
                {this.props.children}
            </div>
        );
    }
}