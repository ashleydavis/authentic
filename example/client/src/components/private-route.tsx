/**
 * Defines a private route that requires authentication.
 * If the user is not authenticated they are redirected to the sign-in screen.
 * 
 * https://reacttraining.com/react-router/web/example/auth-workflow
 */

import * as React from 'react';
import { Authentication, IAuthentication } from '../services/authentication';
import { Route, Redirect, RouteComponentProps } from 'react-router';

export interface IPrivateRouteProps {
    //
    // The URL path for the route.
    //
    path: string;

    //
    // Set to true to match the path exactly.
    //
    exact?: boolean;

    render?: ((props: RouteComponentProps<any>) => React.ReactNode);

    component?: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
}

export interface IPrivateRouteState {
}

export class PrivateRoute extends React.Component<IPrivateRouteProps, IPrivateRouteState> {

    private authentication: IAuthentication = Authentication.getInstance(); //TODO: DI

    constructor(props: IPrivateRouteProps) {
        super(props);

        this.state = {};

        this.onSigninCheckCompleted = this.onSigninCheckCompleted.bind(this);
    }

    componentDidMount() {
        this.authentication.onSigninCheckCompleted.attach(this.onSigninCheckCompleted);
        this.authentication.onSignedOut.attach(this.onSigninCheckCompleted);
    }

    componentWillUnmount() {
        this.authentication.onSigninCheckCompleted.detach(this.onSigninCheckCompleted);
        this.authentication.onSignedOut.attach(this.onSigninCheckCompleted);
    }

    onSigninCheckCompleted() {
        this.forceUpdate();
    }

    render() {

        if (!this.authentication.signinCheckCompleted()) {
            // 
            // Delay loading route until we have checked if the user is signed in.
            //
            return <div>Loading...</div>;
        }
        else if (this.authentication.isSignedIn()) {
            // 
            // User is signed in, so render the actual component.
            //
            return (
                <Route 
                    path={this.props.path}
                    exact={this.props.exact}
                    render={this.props.render}
                    component={this.props.component}
                    >
                    {this.props.children}
                </Route>
            );
        }
        else {
            // 
            // User is not signed in, redirect them.
            //
            return <Redirect 
                to={{
                    pathname: "/auth/signup",
                    state: {
                        from: (this.props as any).location, // Can't type this correctly unfortunately because it causes TypeScript issues.
                    },
                }}
                />;
        }
    }
}