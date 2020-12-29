/**
 * A container component that centers it's content on screen.
 */

import * as React from 'react';

export interface IContainerProps {
    /**
     * Specifies the width of the container.
     */
    width?: string;

    /**
     * Specifies the maximum width of the container.
     */
    maxWidth?: string;
}

export class Container extends React.Component<IContainerProps, {}> {

    render() {
        return (
            <div
                style={{
                    width: this.props.width || "90%",
                    maxWidth: this.props.maxWidth,
                    margin: "0 auto",
                }}
                >
                {this.props.children}
            </div>
        );
    }
}