declare module '@deck.gl/react' {
  import { Component } from 'react';
  
  interface DeckGLProps {
    layers?: any[];
    viewState?: any;
    onViewStateChange?: (params: any) => void;
    onHover?: (info: any) => void;
    onClick?: (info: any) => void;
    controller?: boolean;
    [key: string]: any;
  }
  
  export default class DeckGL extends Component<DeckGLProps> {}
}

declare module '@deck.gl/layers' {
  export class IconLayer {
    constructor(props: any);
  }
  
  export class PolygonLayer {
    constructor(props: any);
  }
  
  export class ScatterplotLayer {
    constructor(props: any);
  }
  
  export class GeoJsonLayer {
    constructor(props: any);
  }
}

declare module '@deck.gl/core' {
  export interface MapViewState {
    longitude: number;
    latitude: number;
    zoom: number;
    bearing?: number;
    pitch?: number;
  }
}

declare module 'react-map-gl' {
  import { Component } from 'react';
  
  interface MapProps {
    mapboxAccessToken?: string;
    mapStyle?: string;
    onMove?: (evt: any) => void;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    [key: string]: any;
  }
  
  export default class Map extends Component<MapProps> {}
}