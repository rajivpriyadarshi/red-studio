"""Render the original counter set. Run with Blender in background mode."""
import math
from pathlib import Path

import bpy
from mathutils import Vector

root = Path(__file__).resolve().parents[2] / "dist"
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.world.color = (.24, .24, .24)
scene.view_settings.view_transform = "AgX"


def material(name, color, roughness, metal=0, coat=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Coat Weight"].default_value = coat
    return mat


red = material("Oxide red enamel", (.40, .028, .009), .30, .32, .36)
steel = material("Brushed nickel", (.35, .32, .25), .29, .87)
brass = material("Aged bronze", (.23, .136, .062), .35, .77)
black = material("Slot interior", (.009, .011, .009), .47)
frame = material("Bottle green steel", (.022, .057, .046), .28, .44, .32)
ivory = material("Ivory enamel", (.86, .76, .54), .31, .22, .31)
glass = material("Reeded glass", (.30, .48, .38), .22, .19, .55)
glass.node_tree.nodes.get("Principled BSDF").inputs["Transmission Weight"].default_value = .48


def box(name, location, size, mat, bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("Rolled edge", "BEVEL")
        mod.width, mod.segments = bevel, 4
        obj.modifiers.new("Face normals", "WEIGHTED_NORMAL")
    return obj


def area(name, origin, target, power, width, height, color):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.shape, data.size, data.size_y, data.color = power, "RECTANGLE", width, height, color
    lamp = bpy.data.objects.new(name, data)
    scene.collection.objects.link(lamp)
    lamp.location = origin
    lamp.rotation_euler = (Vector(target) - lamp.location).to_track_quat("-Z", "Y").to_euler()


box("Back of booth", (0, .7, 4.8), (14, .2, 7), frame)
# Curved ribs catch the tall softboxes as slender highlights across the glazing.
verts, faces = [], []
for i in range(1401):
    x = i / 100 - 7
    y = .14 + .048 * math.cos(x * math.tau / .193)
    verts.extend([(x, y, 3.5), (x, y, 8.2)])
    if i:
        a = 2 * i
        faces.append((a-2, a, a+1, a-1))
mesh = bpy.data.meshes.new("Fluted pane")
mesh.from_pydata(verts, [], faces)
pane = bpy.data.objects.new("Fluted pane", mesh)
scene.collection.objects.link(pane)
pane.data.materials.append(glass)
for poly in mesh.polygons:
    poly.use_smooth = True
for x in (-5.55, 5.55):
    box("Window jamb", (x, -.12, 5.3), (.24, .44, 7), frame)
    box("Nickel glazing bead", (x * .977, -.22, 5.3), (.035, .12, 7), steel, .012)
box("Transom", (0, -.08, 7.0), (14, .34, .20), frame)
box("Upper enamel panel", (0, -.19, 3.48), (14, .48, 1.12), red, .08)
box("Metal sill", (0, -.39, 4.045), (14, .17, .07), steel, .025)
box("Counter apron", (0, -.25, 1.58), (14, .63, 3.03), red, .07)
box("Ticket slot surround", (0, -.505, 3.14), (8.8, .20, .20), brass, .065)
box("Ticket slot", (0, -.61, 3.15), (8.57, .05, .109), black, .045)
box("Counter ledge", (0, -1.20, .55), (14, 2.55, .28), red, .12)
box("Ledge trim", (0, -2.46, .52), (14, .035, .033), steel, .01)
box("Front fascia", (0, -2.26, -.15), (14, .26, 1.28), red)
# A stove-enamel station plate mounted off the glass casts a real contact shadow.
box("Rim of sign", (0, -.27, 5.58), (5.80, .16, 1.05), frame, .12)
box("Enamel sign", (0, -.36, 5.58), (5.69, .10, .94), ivory, .088)
font = bpy.data.fonts.load(str(root / "assets/space-bold.ttf"))
bpy.ops.object.text_add(location=(0, -.422, 5.58), rotation=(math.pi / 2, 0, 0))
type_obj = bpy.context.object
type_obj.data.body = "BILLETTLUKE"
type_obj.data.font = font
type_obj.data.align_x = type_obj.data.align_y = "CENTER"
type_obj.data.space_character = 1.15
type_obj.data.size = .71
type_obj.data.materials.append(frame)
for x in (-2.58, 2.58):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, radius=.059, location=(x,-.417,5.58))
    bpy.context.object.scale.y = .5
    bpy.context.object.data.materials.append(steel)
    screw = box("Screw slot", (x,-.446,5.58), (.064,.013,.012), black,.004)
    screw.rotation_euler.y = -.58
area("North window", (-6,-5,9), (0,0,3.2), 1000, 3.8, 6.5, (1,.88,.73))
area("Cold rim", (6,-3,6), (0,0,4), 720, 1.1, 6, (.72,.88,1))
area("Top light", (0,-.3,10), (0,-1,2), 500, 7, 1.8, (1,.92,.81))
area("Front fill", (0,-10,6), (0,0,3), 310, 6, 4, (1,.92,.82))
bpy.ops.object.camera_add(location=(0,-22,7.25))
camera = bpy.context.object
camera.rotation_euler = (Vector((0,0,3.24)) - camera.location).to_track_quat("-Z","Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 12.1
scene.camera = camera
scene.render.resolution_x, scene.render.resolution_y = 1500, 920
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "WEBP"
scene.render.image_settings.quality = 87
scene.render.filepath = str(root / "assets/ticket-window/counter.webp")
bpy.ops.render.render(write_still=True)
