precision highp float;

uniform sampler2D tMap;
uniform sampler2D tAtlas;
uniform vec2 uMapResolution;
uniform vec2 uResolution;
uniform vec2 uScreenResolution;
uniform float uCharCount;
uniform float uSkipAscii;
uniform float uAsciiOpacity;
uniform sampler2D tMouseTrail;
uniform float uMouseTrailStrength;
uniform float uTime;
uniform float uTransition;
uniform float uInvert;
uniform vec3 uBackgroundColor;

varying vec2 vUv;
varying vec3 vNormal;

float mapRange(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

float noise(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float random (vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

vec2 scaleUv (vec2 uv, float scale) {
  return (uv - 0.5) * (1.0 / scale) + 0.5;
}

void main() {
    vec2 uv = vUv;

    // Mouse trail displacement
    float trailIntensity = texture2D(tMouseTrail, uv).r * uMouseTrailStrength;
    trailIntensity = smoothstep(0.05, 1.0, trailIntensity);

    // Grid
    vec2 normalizedPixelSize = 1.0 / uMapResolution;
    vec2 uvPixel = normalizedPixelSize * floor(uv / normalizedPixelSize);
    vec2 cellUV = fract(uv / normalizedPixelSize);
    vec3 grid = vec3(cellUV.x * cellUV.y, 0.0, 0.0);

    // Noise
    vec2 noiseUV = uv / normalizedPixelSize;
    noiseUV = floor(noiseUV);
    float noise = random(noiseUV);
    noise += uTime * 0.1;
    noise = mod(noise, 1.0);

    // Transition Mask
    vec2 transitionUV = scaleUv(uvPixel, uTransition);
    float transition = length(transitionUV - 0.5);
    float transitionNoise = random(floor(uv / normalizedPixelSize));
    float transitionFadeSize = 0.1;
    float transitionNoiseStrength = 1.0;
    transition += (transitionNoise - 0.5) * transitionNoiseStrength;
    transition = 1.0 - smoothstep(uTransition - transitionFadeSize / 2.0, uTransition + transitionFadeSize / 2.0, transition);
    transition *= step(0.0001, uTransition);

    // Texture
    vec3 tex = texture2D(tMap, uv).rgb;

    if (uSkipAscii > 0.5) {
        gl_FragColor = vec4(tex, 1.0);
        return;
    }

    // Texture + Noise
    tex = mix(tex, vec3(noise), trailIntensity);

    // Luminance
    float luma = dot(vec3(0.2126, 0.7152, 0.0722), tex.rgb);

    // Map luminance to character index
    float charIndexLuma = floor(luma * uCharCount);
    charIndexLuma = clamp(charIndexLuma, 0.0, uCharCount - 1.0);

    // Map noise to character index
    float charIndexNoise = floor(noise * uCharCount);
    charIndexNoise = clamp(charIndexNoise, 0.0, uCharCount - 1.0);

    // Sample character from atlas
    vec2 atlasUV = vec2(cellUV.x, cellUV.y);
    float charSize = 1.0 / uCharCount;

    // Luma Atlas UV
    float lumaCharStart = charSize * charIndexLuma;
    float lumaCharEnd = lumaCharStart + charSize;
    vec2 lumaAtlasUv = atlasUV;
    lumaAtlasUv.x = mapRange(cellUV.x, 0.0, 1.0, lumaCharStart, lumaCharEnd) + (trailIntensity);

    // Noise Atlas UV
    float noiseCharStart = charSize * charIndexNoise;
    float noiseCharEnd = noiseCharStart + charSize;
    vec2 noiseAtlasUv = atlasUV;
    noiseAtlasUv.x = mapRange(cellUV.x, 0.0, 1.0, noiseCharStart, noiseCharEnd);

    // Char Color Texture
    vec3 charColorTexture = texture2D(tAtlas, lumaAtlasUv).rgb;
    charColorTexture = mix(charColorTexture, vec3(1.0, 1.0, 1.0), 1.0 - luma);
    charColorTexture = vec3(charColorTexture.r);

    // // Char Color Texture
    vec3 charColorNoise = texture2D(tAtlas, noiseAtlasUv).rgb;

    // Output
    vec3 fragColorTexNoise = mix(charColorTexture, charColorNoise, trailIntensity);
    vec3 fragColorFakeAlpha = mix(vec3(1.0), fragColorTexNoise, uAsciiOpacity * transition);

    // Theme, remaps the white background to uBackgroundColor
    vec3 fragColorLight = fragColorFakeAlpha * uBackgroundColor;
    vec3 fragColorDark = uBackgroundColor + (1.0 - fragColorFakeAlpha) * (1.0 - uBackgroundColor);
    vec3 fragColorTheme = mix(fragColorLight, fragColorDark, uInvert);
    gl_FragColor = vec4(fragColorTheme, 1.0);

    // Debug Outputs
    // gl_FragColor = vec4(charColorTexture, uAsciiOpacity);
    // gl_FragColor = vec4(vec3(noise), 1.0);
    // gl_FragColor = vec4(vec3(noise * trailIntensity), 1.0);
    // gl_FragColor = vec4(tex, 1.0);
    // gl_FragColor = vec4(vec3(transition), 1.0);
}
