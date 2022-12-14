import * as THREE from 'three'
import { Vec2 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import * as TWEEN from '@tweenjs/tween.js'
import { addLight, addCamera, addAnnotationSprite } from './utils'
import { annotation } from './house_annotation'

import './styles/style.css'
import { fail } from 'assert'

let scene = new THREE.Scene()
const renderer = new THREE.WebGLRenderer({ antialias: true })
const labelRenderer = new CSS2DRenderer()
const developerMode = false

let camera: THREE.PerspectiveCamera
let raycaster: THREE.Raycaster
let annotationSprite = new THREE.Sprite()
let sceneObjects = new Array()
let annotationLabels = new Array()
let pointer: THREE.Vector2 = new THREE.Vector2()
let controls: OrbitControls
let annotationSpriteList: Array<THREE.Sprite> = []
const clock = new THREE.Clock()

// ------------Animation
let mixerOldGuy: THREE.AnimationMixer
let oldGuyLoaded: boolean = false
let ActionLists: Array<THREE.AnimationAction> = []
let activeAction: THREE.AnimationAction
let currentActiveAction: THREE.AnimationAction

//

let imageMap: THREE.Texture = new THREE.TextureLoader().load('textures/circle_texture.png')
window.addEventListener('click', checkAnnotationClick)
const animationListObject: any = {
    default: () => setActiveAction(ActionLists[0]),
}

function init() {
    scene = addLight(scene)
    scene.background = new THREE.Color(0xffffff)
    camera = addCamera()

    raycaster = new THREE.Raycaster()

    const element = document.createElement('div') as HTMLElement
    labelRenderer.setSize(window.innerWidth, innerHeight)
    labelRenderer.domElement.style.position = 'absolute'
    labelRenderer.domElement.style.top = '0px'
    labelRenderer.domElement.style.pointerEvents = 'none'
    document.body.appendChild(labelRenderer.domElement)

    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    controls = new OrbitControls(camera, renderer.domElement) // (, html element used for event listener)
    controls.target.set(0.0, 130.0, 5.0)
    controls.dampingFactor = 0.15
    controls.enableDamping = true
    // const geometry = new THREE.BoxGeometry(1, 1, 1)
    // const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    // const cube = new THREE.Mesh(geometry, material)
    // cube.position.set(0.0, 130.0, 5.0)
    // scene.add(cube)

    controls.enableDamping = true
    document.addEventListener('mousemove', onPointerMove)
    controls.addEventListener('change', function () {
        let rayDirection = new THREE.Vector3()
            .subVectors(camera.position, controls.target)
            .normalize()
        raycaster.set(controls.target, rayDirection)
        let intersects = raycaster.intersectObjects(sceneObjects, false)
        if (intersects.length > 0) {
            if (camera.position.distanceTo(controls.target) > intersects[0].distance) {
                // camera.position.set(
                //     intersects[0].point.x,
                //     intersects[0].point.y,
                //     intersects[0].point.z
                // )
                console.log('hit')
            }
        }
    })
    const manager = new THREE.LoadingManager()
    const fbxManager = new THREE.LoadingManager()

    const objLoader = new OBJLoader()
    const gltfLoader = new GLTFLoader(manager)
    const fbxLoader = new FBXLoader(fbxManager)

    manager.onProgress = (url, itemsLoaded, itemsTotal) => {
        console.log((itemsLoaded / itemsTotal) * 100 + '% item loaded')
    }
    manager.onLoad = () => {
        console.log('Room Loadeded')
    }

    gltfLoader.setPath('./models/').load(
        'scene.gltf',
        function (gltf) {
            gltf.scene.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    const _child = child as THREE.Mesh
                    _child.castShadow = true
                    _child.receiveShadow = true
                    _child.scale.set(100, 100, 100)
                    sceneObjects.push(_child)
                }
                if (child instanceof THREE.Light) {
                    const _light = child as THREE.Light
                    _light.castShadow = true
                    _light.shadow.bias = 0.0008 // to reduce artifact in shadow
                    _light.shadow.mapSize.width = 1024
                    _light.shadow.mapSize.height = 1024
                }
            })
            scene.add(gltf.scene)
        },
        (xhr) => {
            console.log(xhr.loaded)
            console.log((xhr.loaded / xhr.total) * 100 + '%loaded')
        },
        (error) => {
            console.log(error)
        }
    )

    fbxLoader.setPath('./models/oldPerson/').load('Boss.fbx', (object) => {
        // object->animations-> Array(1)->animationclip
        mixerOldGuy = new THREE.AnimationMixer(object)
        console.log(object)
        const action = mixerOldGuy.clipAction(object.animations[0])
        ActionLists.push(action)
        currentActiveAction = ActionLists[0]
        object.traverse(function (child) {
            if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true
                child.receiveShadow = true
            }
        })
        let center = new THREE.Vector3()
        let size = new THREE.Vector3()

        let box = new THREE.Box3().setFromObject(object) //compute AABB
        // get it's center and size
        box.getCenter(center)
        box.getSize(size)

        let maxSideDimension = Math.max(size.x, size.y, size.z)
        // normalize the men to unit size
        object.scale.multiplyScalar(1.0 / maxSideDimension)
        object.position.y += center.y
        object.position.x = -500
        object.quaternion.setFromEuler(new THREE.Euler(0, Math.PI / 1.5, 0))
        box.setFromObject(object)
        box.getCenter(center)
        box.getSize(size)
        object.position.y -= center.y / 2
        object.scale.multiplyScalar(150)

        scene.add(object)

        console.log(object.position.x)
        // once a scene is loaded load those animation file in chain

        fbxLoader.load('RumbaDancing.fbx', (object) => {
            const actionDance = mixerOldGuy.clipAction(object.animations[0])
            ActionLists.push(actionDance)
            let pos0 = ActionLists.length - 1
            animationListObject['dance'] = () => setActiveAction(ActionLists[1])
            fbxLoader.load('MoveOrder.fbx', (object) => {
                const actionMoveOrder = mixerOldGuy.clipAction(object.animations[0])
                ActionLists.push(actionMoveOrder)
                let pos1 = ActionLists.length - 1
                animationListObject['moveOrder'] = () => setActiveAction(ActionLists[2])
                fbxLoader.load('Salute.fbx', (object) => {
                    const actionSalute = mixerOldGuy.clipAction(object.animations[0])
                    ActionLists.push(actionSalute)
                    let pos2 = ActionLists.length - 1
                    animationListObject['salute'] = () => setActiveAction(ActionLists[3])
                    fbxLoader.load('Walk.fbx', (object) => {
                        const actionWalk = mixerOldGuy.clipAction(object.animations[0])
                        ActionLists.push(actionWalk)
                        let pos3 = ActionLists.length - 1
                        animationListObject['walk'] = () => setActiveAction(ActionLists[4])
                        animationListObject['dance']()
                        oldGuyLoaded = true
                    })
                })
            })
        })
    })

    // new MTLLoader().setPath('models/').load('house_water.mtl', function (materials) {
    //     materials.preload()
    //     objLoader
    //         .setMaterials(materials)
    //         .setPath('models/')
    //         .load('house_water.obj', function (object) {
    //             // object.traverse(function (child) {
    //             //     if (child instanceof THREE.Mesh) {
    //             //         scene.add(child)
    //             //     }
    //             // })
    //             object.scale.set(0.04, 0.04, 0.04)
    //             scene.add(object)
    //             loadAnnotationIntoScene()
    //         })
    // })

    window.addEventListener('resize', onWindowResize)
}

function performAnnotation(event: MouseEvent) {
    console.log(event)
    console.log('hello')
}

function setActiveAction(action: THREE.AnimationAction) {
    // we can do deep comparision between two object with stringify or lodash isEqual but even first layer equality check is enough for now
    if (action != currentActiveAction) {
        currentActiveAction.fadeOut(1)
        currentActiveAction = action
        action.reset()
        action.fadeIn(1)
        action.play()
    }
    // check if it is not the one going on right now
    // if not then change the active to this and stop last action
}

function checkAnnotationClick(event: MouseEvent) {
    raycaster.setFromCamera(pointer, camera)
    const intersects = raycaster.intersectObjects(annotationSpriteList, true)
    if (intersects.length > 0) {
        if (intersects[0].object.userData.annotationId != undefined) {
            const index = intersects[0].object.userData.annotationId
            const annotationData = annotation[index]
            displayDescription(index)
            makeMove(annotationData)
        }
    }
}

function displayDescription(index: any) {
    console.log(index)
    let allDescDiv = document.getElementsByClassName('description-div')
    for (let i = 0, length = allDescDiv.length; i < length; i++) {
        ;(allDescDiv[i] as HTMLElement).style.display = 'none'
    }
    let visibleDiv = document.getElementById('label' + index) as HTMLElement
    visibleDiv.style.display = 'block'
}

function makeMove(params: any, index?: any) {
    new TWEEN.Tween(camera.position)
        .to(
            {
                x: params.cameraPosition.x,
                y: params.cameraPosition.y,
                z: params.cameraPosition.z,
            },
            1000
        )
        .easing(TWEEN.Easing.Cubic.Out)
        .start()

    new TWEEN.Tween(controls.target)
        .to(
            {
                x: params.lookAt.x,
                y: params.lookAt.y,
                z: params.lookAt.z,
            },
            2500
        )
        .easing(TWEEN.Easing.Cubic.Out)
        .start()
    if (index != undefined) {
        displayDescription(index)
    }
    // camera.position.set(params.cameraPosition.x, params.cameraPosition.y, params.cameraPosition.z)
    // controls.target.set(params.lookAt.x, params.lookAt.y, params.lookAt.z)
}

function updateOpacity() {}

function loadAnnotationIntoScene() {
    const menuPanel = document.getElementById('menu-panel') as HTMLDivElement
    const _menuList = document.createElement('ul') as HTMLUListElement
    menuPanel.appendChild(_menuList)

    annotation.forEach((element, index) => {
        const myList = document.createElement('li') as HTMLLIElement
        const _list = _menuList.appendChild(myList)
        const myButton = document.createElement('button') as HTMLButtonElement
        _list.appendChild(myButton)
        myButton.classList.add('annotationButton')
        myButton.innerHTML = index + ' : ' + element['text']
        myButton.addEventListener(
            'click',
            () => {
                makeMove(element, index)
            },
            false
        )
        const material = new THREE.SpriteMaterial({
            map: imageMap,
            depthTest: false,
            depthWrite: false,
            sizeAttenuation: false,
            // depthTest: true,
        })
        //create annotation sprite and annotation label at lookat position
        const myAnnotationSprite = new THREE.Sprite(material)
        myAnnotationSprite.position.set(element.lookAt.x, element.lookAt.y, element.lookAt.z)
        myAnnotationSprite.userData.annotationId = index
        myAnnotationSprite.scale.set(0.1, 0.1, 0.1)
        scene.add(myAnnotationSprite)
        annotationSpriteList.push(myAnnotationSprite)

        const annotationLableDiv = document.createElement('div')
        annotationLableDiv.classList.add('a-label')
        annotationLableDiv.innerHTML = '' + index
        if (element.description != undefined) {
            const descriptionDiv = document.createElement('div') as HTMLElement
            descriptionDiv.classList.add('description-div')
            descriptionDiv.setAttribute('id', 'label' + index)
            descriptionDiv.innerHTML = element.description
            annotationLableDiv.appendChild(descriptionDiv)
        }
        const annotationLabelObject = new CSS2DObject(annotationLableDiv)
        annotationLabelObject.position.set(element.lookAt.x, element.lookAt.y, element.lookAt.z)
        // annotationLabels.push(annotationLabelObject)
        scene.add(annotationLabelObject)
    })
}

loadAnnotationIntoScene()

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    labelRenderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

function onPointerMove(event: MouseEvent) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
}

function animate() {
    requestAnimationFrame(animate)
    TWEEN.update()
    if (oldGuyLoaded) {
        mixerOldGuy.update(clock.getDelta())
    }
    controls.update()
    if (developerMode) {
        raycaster.setFromCamera(pointer, camera)
        const intersects = raycaster.intersectObjects(scene.children, true)
        if (intersects.length > 0) {
            let result = new THREE.Vector3()
            camera.getWorldPosition(result)
            console.log(result)
            console.log('target', intersects[0].point)
        }
    }
    render()
}

function render() {
    labelRenderer.render(scene, camera)
    renderer.render(scene, camera)
}
init()

// console.log(audio1)
// audio1.play()
animate()
document.getElementById('music')?.click()
export { animationListObject }
