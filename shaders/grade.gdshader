shader_type canvas_item;
// Finishing pass for the play field: a little extra saturation and contrast,
// and a soft vignette. One texture read per pixel (phone-friendly).
uniform sampler2D screen_tex : hint_screen_texture, filter_linear;
uniform float saturation = 1.15;
uniform float contrast = 1.07;
uniform float vignette = 0.38;

void fragment() {
	vec3 c = texture(screen_tex, SCREEN_UV).rgb;
	float l = dot(c, vec3(0.299, 0.587, 0.114));
	c = mix(vec3(l), c, saturation);
	c = (c - 0.5) * contrast + 0.5;
	vec2 d = SCREEN_UV - 0.5;
	c *= 1.0 - vignette * smoothstep(0.3, 0.85, length(d * vec2(1.0, 0.85)) * 1.2);
	COLOR = vec4(max(c, vec3(0.0)), 1.0);
}
