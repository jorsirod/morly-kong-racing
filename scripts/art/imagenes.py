#!/usr/bin/env python3
"""Arte de Morly Kong Racing con Qwen Image 2.1 Turbo (GGUF) en el ComfyUI local (127.0.0.1:8188).
Encola cada imagen, espera a que termine y la deja en ComfyUI_Clean/output/morly/. Si ya existe, se salta."""
import json, time, urllib.request, uuid, glob, os
API = "http://127.0.0.1:8188"
OUT = "/Users/Jorsi/Documents/ComfyUI_Clean/output/morly"
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
SIGMAS = "1.0,0.978453,0.95418,0.926626,0.89508,0.845148,0.704534,0.414568,0.0"
STYLE = ("Vibrant early-2000s arcade racing video game key art, bold cel-shaded cartoon illustration with thick clean outlines, "
         "super saturated tropical colors, dynamic low camera angle, sunny dramatic light, playful and funny mood, highly detailed. "
         "No text, no letters, no words, no logos, no watermark.")
NEG = "text, letters, words, caption, watermark, logo, signature, blurry, low quality, dull colors, photo, photorealistic, deformed, extra wheels"
JOBS = [
 ("icon", 1024, 1024, [11, 23], "Square mobile app icon for a kart racing game: one chunky cute cartoon grey boxy 2008 Suzuki Jimny 4x4 seen from the front, "
  "jumping toward the viewer, big round glowing headlights, chrome grille, a grinning cartoon driver behind the windshield, small dust clouds and sparks, "
  "radiant sunburst background in yellow, orange, magenta and violet, centered, very simple bold shapes that read clearly at small size."),
 ("cover", 1344, 768, [7, 31], "Key art for a kart racing game set in Managua, Nicaragua: a small boxy grey Suzuki Jimny 4x4 flying off a ramp toward the camera on the right, "
  "a grinning cartoon driver, followed by a white Toyota Hilux pickup, an orange hatchback, a black mini hatchback and a beat-up white sedan with a shark sticker, "
  "sparks, confetti and speed lines; background: Lake Managua at golden sunset, a volcano silhouette, palm trees, colorful market stalls and giant yellow metal "
  "Tree of Life light sculptures along the avenue; sky gradient violet to magenta to orange; calm empty sky area on the left third."),
 ("world-la-salle", 1344, 768, [5], "A kart racing track running through a classic Catholic boys' high school campus in Nicaragua: cream and terracotta two-story school building "
  "with arched corridors, a basketball court, a green soccer field with goals, a small school cafeteria kiosk, tall tropical trees, red and white curbs, cartoon karts racing."),
 ("world-oriental", 1344, 768, [5], "A kart racing track through a chaotic crowded open-air market in Managua: colorful tarp-covered stalls with fruit, clothes and piñatas, "
  "tangled hanging cables, a busy four-way intersection with a traffic light and brightly painted old American school buses crossing, vendors pushing carts, cartoon karts racing."),
 ("world-managua", 1344, 768, [5], "A kart race through Managua city at sunset: a big roundabout with a fountain, an old ruined cathedral with twin towers, a modern shopping mall, "
  "giant yellow metal Tree of Life sculptures glowing, palm trees, a highway overpass, the lake in the distance, cartoon karts racing."),
 ("world-hipa-hipa", 1344, 768, [5], "A kart race track inside a huge open-air tropical nightclub at night: a round dance floor with neon lights around one giant palm tree in the center, "
  "an elevated spiral ramp circling the palm three times, bars with glowing bottles, disco lights and lasers, purple and turquoise night sky, cartoon karts racing."),
 ("world-masaya", 1344, 768, [5], "A kart race track climbing an active volcano in Nicaragua: smoking crater with glowing orange lava, dark volcanic rock and black sand, "
  "a stone national park entrance arch, a white cross on a hilltop, steam vents, lush green slopes below, sunset sky, cartoon karts racing."),
 ("world-san-juan", 1344, 768, [5], "A kart race track along a tropical bay in San Juan del Sur, Nicaragua: turquoise crescent bay with fishing boats, a big white Christ statue "
  "on the green hilltop, palm trees, sandy jump ramps on the beach, a wooden pier, bright sunny sky, cartoon karts racing."),
 ("world-isletas", 1344, 768, [5, 17], "A kart racing track hopping across dozens of small tropical islets on a big lake in Granada, Nicaragua: wooden bridges and a long wooden pier "
  "linking lush green volcanic-rock islets with palm trees and thatched-roof huts, colorful canopy tour boats crossing the water in front of the road, a big jump ramp over the water, "
  "the green Mombacho volcano in the background, bright sunny sky, cartoon karts racing."),
 ("world-playland", 1344, 768, [5, 17], "A kart racing track through a traveling amusement park fair in Managua at dusk: a giant Ferris wheel covered in colorful light bulbs, "
  "a spinning carousel, a small roller coaster loop over the road, red and white striped circus tents, cotton candy and food stalls, strings of glowing light bulbs, bunches of balloons, "
  "a little kiddie train crossing the track, violet and orange sunset sky, cartoon karts racing."),
 ("car-el-tiburon", 1152, 720, [9, 21], "Vehicle card for a kart racing game: one beat-up white year-2000 Toyota Echo Yaris small four-door sedan seen from the rear three-quarter view, "
  "tall rounded bubble body, large unpainted matte black plastic bumpers front and rear, black steel wheels without hubcaps, rounded red tail lights at the corners, "
  "a big funny cartoon shark sticker with an open toothy mouth stuck flat on the back of the trunk lid facing the viewer, a few small dents and rust spots, "
  "centered on a simple bright turquoise to yellow gradient background with speed lines, no driver."),
 ("pilot-semilla", 768, 768, [3], 'Bust portrait for a kart racing game character select screen: a lanky Nicaraguan man in his thirties, light brown skin, short cropped black hair, short beard and thick moustache, sly smirk, casual beige shirt, holding up a cold beer bottle with a plain white label. Head and shoulders, centered, looking at the camera, big expressive caricature head, early-2000s arcade game character art, bold cel-shaded cartoon illustration with thick clean outlines, plain flat background in warm amber with a soft radial sunburst. No text, no letters, no logos.'),
 ("pilot-morly", 768, 768, [3], 'Bust portrait for a kart racing game character select screen: a big burly Nicaraguan man in his thirties, brown skin, short black hair, short beard and thick moustache, huge playful grin, wearing a purple and gold basketball jersey and a cream cap, holding a bag of ice. Head and shoulders, centered, looking at the camera, big expressive caricature head, early-2000s arcade game character art, bold cel-shaded cartoon illustration with thick clean outlines, plain flat background in golden yellow with a soft radial sunburst. No text, no letters, no logos.'),
 ("pilot-chete", 768, 768, [3], 'Bust portrait for a kart racing game character select screen: a chubby cheerful Nicaraguan man in his thirties, light tan skin, side-parted dark brown hair, round chubby cheeks, wide smile, dark green polo shirt, fanning a stack of banknotes with a gold coin flying. Head and shoulders, centered, looking at the camera, big expressive caricature head, early-2000s arcade game character art, bold cel-shaded cartoon illustration with thick clean outlines, plain flat background in emerald green with a soft radial sunburst. No text, no letters, no logos.'),
 ("pilot-coconitas", 768, 768, [3], 'Bust portrait for a kart racing game character select screen: an athletic Nicaraguan man in his thirties, tan skin, spiky black hair, open-mouth competitive shout, orange basketball jersey, spinning a basketball on one finger. Head and shoulders, centered, looking at the camera, big expressive caricature head, early-2000s arcade game character art, bold cel-shaded cartoon illustration with thick clean outlines, plain flat background in bright orange with a soft radial sunburst. No text, no letters, no logos.'),
 ("pilot-calin", 768, 768, [3], 'Bust portrait for a kart racing game character select screen: a laid-back relaxed Nicaraguan man in his thirties, tan skin, sleepy half-closed eyes, calm little smile, big nose, white t-shirt, red baseball cap, a few green leaves floating around. Head and shoulders, centered, looking at the camera, big expressive caricature head, early-2000s arcade game character art, bold cel-shaded cartoon illustration with thick clean outlines, plain flat background in tomato red with a soft radial sunburst. No text, no letters, no logos.'),
 ("pilot-sap-heinz", 768, 768, [3], 'Bust portrait for a kart racing game character select screen: a tall thin Nicaraguan man in his thirties, fair skin, light brown side-parted hair, long narrow face, smirk, green shirt, a cute little cartoon frog sitting on his shoulder, holding a slice of pizza. Head and shoulders, centered, looking at the camera, big expressive caricature head, early-2000s arcade game character art, bold cel-shaded cartoon illustration with thick clean outlines, plain flat background in leaf green with a soft radial sunburst. No text, no letters, no logos.'),
 ("pilot-enanonitas", 768, 768, [3], 'Bust portrait for a kart racing game character select screen: a short stocky Nicaraguan man in his thirties, tan skin, black hair combed up, thin moustache, wide happy grin, dark red shirt, holding a big onion. Head and shoulders, centered, looking at the camera, big expressive caricature head, early-2000s arcade game character art, bold cel-shaded cartoon illustration with thick clean outlines, plain flat background in dusty rose with a soft radial sunburst. No text, no letters, no logos.'),
 ("pilot-jorsi", 768, 768, [3], 'Bust portrait for a kart racing game character select screen: a creative Nicaraguan artist in his thirties, tan skin, dark quiff hairstyle, goatee, big grin, teal shirt with colorful paint splatters, pencil behind his ear, holding a paintbrush. Head and shoulders, centered, looking at the camera, big expressive caricature head, early-2000s arcade game character art, bold cel-shaded cartoon illustration with thick clean outlines, plain flat background in turquoise with a soft radial sunburst. No text, no letters, no logos.'),
 ("pilot-roman", 768, 768, [3], 'Bust portrait for a kart racing game character select screen: a Nicaraguan man in his thirties with curly black hair, full black beard and moustache, light tan skin, smirk, red polo shirt, doing a funky dance pose while holding a fork. Head and shoulders, centered, looking at the camera, big expressive caricature head, early-2000s arcade game character art, bold cel-shaded cartoon illustration with thick clean outlines, plain flat background in crimson with a soft radial sunburst. No text, no letters, no logos.'),
 ("pilot-cucukis", 768, 768, [3], 'Bust portrait for a kart racing game character select screen: a very thin, pale fair-skinned Nicaraguan man in his thirties with slightly narrow eyes, light brown hair, smirk, white sailor cap, blue sailor shirt with a big square collar and a red neckerchief. Head and shoulders, centered, looking at the camera, big expressive caricature head, early-2000s arcade game character art, bold cel-shaded cartoon illustration with thick clean outlines, plain flat background in royal blue with a soft radial sunburst. No text, no letters, no logos.'),
 ("pilot-raulin", 768, 768, [3], 'Bust portrait for a kart racing game character select screen: a round-faced stocky Nicaraguan man in his thirties, tan skin, buzz cut, open-mouth laugh, blue-grey shirt, holding a cucumber, with a splash of milk. Head and shoulders, centered, looking at the camera, big expressive caricature head, early-2000s arcade game character art, bold cel-shaded cartoon illustration with thick clean outlines, plain flat background in periwinkle blue with a soft radial sunburst. No text, no letters, no logos.'),
]

def call(path, body=None, timeout=60):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, headers={"Content-Type": "application/json"} if data else {})
    with opener.open(req, timeout=timeout) as r:
        return json.loads(r.read() or b"{}")

def graph(prompt, w, h, seed, prefix):
    return {
     "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": "qwen-image-2.1-turbo-Q4_K_M.gguf"}},
     "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen3vl_8b_int8_convrot.safetensors", "type": "qwen_image", "device": "default"}},
     "3": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_2.1_vae_bf16.safetensors"}},
     "4": {"class_type": "TextEncodeQwenImage21", "inputs": {"clip": ["2", 0], "prompt": prompt, "negative_prompt": NEG, "resolution": 1024}},
     "7": {"class_type": "EmptyLatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
     "8": {"class_type": "RandomNoise", "inputs": {"noise_seed": seed}},
     "9": {"class_type": "BasicGuider", "inputs": {"model": ["1", 0], "conditioning": ["4", 0]}},
     "10": {"class_type": "KSamplerSelect", "inputs": {"sampler_name": "euler"}},
     "11": {"class_type": "ManualSigmas", "inputs": {"sigmas": SIGMAS}},
     "13": {"class_type": "SamplerCustomAdvanced", "inputs": {"noise": ["8", 0], "guider": ["9", 0], "sampler": ["10", 0], "sigmas": ["11", 0], "latent_image": ["7", 0]}},
     "12": {"class_type": "VAEDecode", "inputs": {"samples": ["13", 1], "vae": ["3", 0]}},
     "14": {"class_type": "SaveImage", "inputs": {"images": ["12", 0], "filename_prefix": prefix}},
    }

def main():
    client = str(uuid.uuid4())
    for name, w, h, seeds, text in JOBS:
        for seed in seeds:
            tag = f"{name}-s{seed}"
            if glob.glob(f"{OUT}/{tag}_*.png"):
                print("ya existe", tag, flush=True); continue
            t = time.time()
            try:
                pid = call("/prompt", {"prompt": graph(text + " " + STYLE, w, h, seed, "morly/" + tag), "client_id": client})["prompt_id"]
            except Exception as e:
                print("FALLÓ al encolar", tag, e, flush=True); continue
            while True:
                time.sleep(4)
                try:
                    hist = call(f"/history/{pid}")
                except Exception:
                    continue
                if pid in hist:
                    st = hist[pid].get("status", {})
                    print(f"imagen {tag}: {st.get('status_str','?')} ({time.time()-t:.0f} s)", flush=True)
                    break
    print("LISTO: imágenes generadas.", flush=True)
    open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "DONE-IMAGENES"), "w").write(time.strftime("%Y-%m-%d %H:%M:%S"))

if __name__ == "__main__":
    main()
