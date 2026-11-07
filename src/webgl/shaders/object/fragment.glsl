precision highp float;

uniform vec3 uBaseColor;
uniform vec3 uFresnelColor;
uniform float uFresnelPower;
uniform float uContrast;
uniform float uBrightness;
uniform float uSaturation;

varying vec3 vWorldNormal;
varying vec3 vViewDirection;
varying vec3 vNormal;

vec3 contrastSaturationBrightness(vec3 color, float con, float sat, float brt) {
    const float AvgLumR = 0.5;
    const float AvgLumG = 0.5;
    const float AvgLumB = 0.5;
    const vec3 LumCoeff = vec3(0.2125, 0.7154, 0.0721);
    vec3 AvgLumin = vec3(AvgLumR, AvgLumG, AvgLumB);
    vec3 brtColor = color * brt;
    vec3 intensity = vec3(dot(brtColor, LumCoeff));
    vec3 satColor = mix(intensity, brtColor, sat);
    vec3 conColor = mix(AvgLumin, satColor, con);
    return conColor;
}

void main() {
    float fresnelFactor = abs(dot(vViewDirection * vec3(1.0, 1.0, 0.9), vWorldNormal));
    float inversefresnelFactor = 1.0 - fresnelFactor;

    // Shaping function
    fresnelFactor = pow(fresnelFactor, uFresnelPower);
    inversefresnelFactor = pow(inversefresnelFactor, uFresnelPower);

    vec3 color = fresnelFactor * uBaseColor + inversefresnelFactor * uFresnelColor;
    color = contrastSaturationBrightness(color, uContrast, uSaturation, uBrightness);

    gl_FragColor = vec4(color, 1.0);
}
